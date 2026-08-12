import json
import time
import requests
import pymysql
import concurrent.futures

BASE_URL = "http://localhost:5000/api"
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "12345678",
    "database": "Hospital_Management_System",
    "autocommit": True
}

def get_db_connection():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)

def get_admin_token():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "admin123"})
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success"):
            return data.get("token")
    raise Exception(f"Failed to get admin token: {resp.text}")

def run_tests():
    token = get_admin_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("==========================================================")
    print("  HOSPITAL MANAGEMENT SYSTEM - EMPIRICAL STRESS TEST SUITE")
    print("==========================================================\n")

    results = []

    # Helper for recording test results
    def log_res(test_name, success, details=""):
        status = "PASS" if success else "FAIL"
        print(f"[{status}] {test_name}")
        if details:
            print(f"       {details}")
        results.append({"test": test_name, "success": success, "details": details})

    # =========================================================================
    # TEST 1: Concurrency / Rapid Duplicate Username Generation
    # =========================================================================
    print("--- TEST 1: Concurrent Duplicate Username Generation ---")
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email LIKE 'conc_%@test.com'")
        cursor.execute("DELETE FROM App_User WHERE Email LIKE 'conc_%@test.com'")

    num_threads = 15
    payloads = [
        {
            "first_name": "ConcurrencyTest",
            "last_name": "User",
            "gender": "Male",
            "date_of_birth": "1990-01-01",
            "job_title": "Receptionist",
            "phone": f"07000000{i:02d}",
            "email": f"conc_user_{i}@test.com",
            "dept_id": 1,
            "salary": 30000
        }
        for i in range(1, num_threads + 1)
    ]

    def post_emp(payload):
        r = requests.post(f"{BASE_URL}/employees", json=payload, headers=headers)
        return r.status_code, r.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(post_emp, p) for p in payloads]
        responses = [f.result() for f in concurrent.futures.as_completed(futures)]

    status_codes = [res[0] for res in responses]
    successes = [res for res in responses if res[0] == 201]
    failures = [res for res in responses if res[0] != 201]

    created_usernames = [res[1].get("username") for res in successes if "username" in res[1]]

    # Check DB directly for any duplicate usernames
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT Username, COUNT(*) as cnt 
            FROM App_User 
            WHERE Username LIKE 'concurrencytest.user%' 
            GROUP BY Username 
            HAVING cnt > 1
        """)
        db_duplicates = cursor.fetchall()

    if len(db_duplicates) > 0:
        log_res("1. Concurrent Username Unique Constraint", False, f"DUPLICATE USERNAMES FOUND IN DB: {db_duplicates}")
    else:
        log_res("1. Concurrent Username Unique Constraint", True, f"No DB duplicate usernames. Total created: {len(successes)}/{num_threads}. Usernames: {created_usernames}")

    if failures:
        print(f"       Note: {len(failures)} concurrent requests failed (Status codes: {[f[0] for f in failures]}, Messages: {[f[1].get('message') for f in failures]})")

    # Cleanup Test 1
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email LIKE 'conc_%@test.com'")
        cursor.execute("DELETE FROM App_User WHERE Email LIKE 'conc_%@test.com'")

    print("")

    # =========================================================================
    # TEST 2: Duplicate Email & Transaction Rollback (Orphan Record Check)
    # =========================================================================
    print("--- TEST 2: Duplicate Email & Transaction Rollback ---")

    # Test 2A: Email that exists in App_User (admin@hospital.com)
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as c FROM App_User")
        users_before = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM Employee")
        emps_before = cursor.fetchone()["c"]

    dup_payload_admin = {
        "first_name": "DupAdmin",
        "last_name": "Test",
        "gender": "Male",
        "job_title": "Receptionist",
        "phone": "0711111111",
        "email": "admin@hospital.com", # existing email
        "dept_id": 1
    }
    r2a = requests.post(f"{BASE_URL}/employees", json=dup_payload_admin, headers=headers)
    
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as c FROM App_User")
        users_after = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM Employee")
        emps_after = cursor.fetchone()["c"]

    t2a_success = (r2a.status_code == 400) and (users_before == users_after) and (emps_before == emps_after)
    log_res("2A. Existing Email (admin@hospital.com) Rejection & Rollback", t2a_success, 
            f"HTTP {r2a.status_code}, Users count: {users_before} -> {users_after}, Emps count: {emps_before} -> {emps_after}")

    # Test 2B: Create Employee E1, then attempt E2 with same email
    e1_email = "rollback_test_dup@hospital.com"
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email = %s", (e1_email,))
        cursor.execute("DELETE FROM App_User WHERE Email = %s", (e1_email,))

    e1_payload = {
        "first_name": "Rollback",
        "last_name": "One",
        "gender": "Female",
        "job_title": "Pharmacist",
        "phone": "0722222222",
        "email": e1_email,
        "dept_id": 1
    }
    r2b_1 = requests.post(f"{BASE_URL}/employees", json=e1_payload, headers=headers)

    # Attempt E2 with same email
    e2_payload = {
        "first_name": "Rollback",
        "last_name": "Two",
        "gender": "Male",
        "job_title": "Pharmacist",
        "phone": "0733333333",
        "email": e1_email,
        "dept_id": 1
    }
    r2b_2 = requests.post(f"{BASE_URL}/employees", json=e2_payload, headers=headers)

    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as c FROM App_User WHERE Email = %s", (e1_email,))
        app_users_for_email = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM Employee WHERE Email = %s", (e1_email,))
        employees_for_email = cursor.fetchone()["c"]

    t2b_success = (r2b_1.status_code == 201) and (r2b_2.status_code == 400) and (app_users_for_email == 1) and (employees_for_email == 1)
    log_res("2B. Duplicate Email Insertion Rollback & No Orphan Records", t2b_success,
            f"E1 HTTP {r2b_1.status_code}, E2 HTTP {r2b_2.status_code}. App_User count for email: {app_users_for_email}, Employee count: {employees_for_email}")

    # Cleanup 2B
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email = %s", (e1_email,))
        cursor.execute("DELETE FROM App_User WHERE Email = %s", (e1_email,))

    print("")

    # =========================================================================
    # TEST 3: Invalid / Non-Existent dept_id Values
    # =========================================================================
    print("--- TEST 3: Invalid / Non-Existent dept_id ---")
    invalid_dept_email = "invalid_dept_test@hospital.com"
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email = %s", (invalid_dept_email,))
        cursor.execute("DELETE FROM App_User WHERE Email = %s", (invalid_dept_email,))

    inv_dept_payload = {
        "first_name": "Invalid",
        "last_name": "DeptUser",
        "gender": "Female",
        "job_title": "Lab Technician",
        "phone": "0744444444",
        "email": invalid_dept_email,
        "dept_id": 999999 # non-existent department
    }
    r3 = requests.post(f"{BASE_URL}/employees", json=inv_dept_payload, headers=headers)

    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as c FROM App_User WHERE Email = %s", (invalid_dept_email,))
        orphan_user = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM Employee WHERE Email = %s", (invalid_dept_email,))
        orphan_emp = cursor.fetchone()["c"]

    t3_success = (r3.status_code in [400, 500]) and (orphan_user == 0) and (orphan_emp == 0)
    log_res("3. Invalid Foreign Key (dept_id=999999) Rollback & No Orphan User", t3_success,
            f"HTTP {r3.status_code}, Message: {r3.json().get('message')}. Orphan App_User count: {orphan_user}, Employee count: {orphan_emp}")

    print("")

    # =========================================================================
    # TEST 4: Missing Required Fields
    # =========================================================================
    print("--- TEST 4: Missing Required Fields Validation ---")
    base_valid = {
        "first_name": "Valid",
        "last_name": "Name",
        "gender": "Male",
        "job_title": "Receptionist",
        "phone": "0755555555",
        "email": "missing_fields_test@hospital.com",
        "dept_id": 1
    }

    required_fields = ["first_name", "last_name", "job_title", "phone", "email", "dept_id"]
    missing_passes = 0
    for field in required_fields:
        payload = base_valid.copy()
        del payload[field]
        r4 = requests.post(f"{BASE_URL}/employees", json=payload, headers=headers)
        if r4.status_code == 400 and not r4.json().get("success"):
            missing_passes += 1
        else:
            print(f"       Failed validation for missing '{field}': HTTP {r4.status_code} {r4.text}")

    log_res("4. Missing Required Fields Rejection (6/6 fields)", missing_passes == len(required_fields),
            f"{missing_passes}/{len(required_fields)} missing field payloads correctly rejected with HTTP 400")

    print("")

    # =========================================================================
    # TEST 5: Edge Case Characters in Names
    # =========================================================================
    print("--- TEST 5: Edge Case Characters in Names ---")
    edge_cases = [
        {"fn": "O'Connor", "ln": "D'Angelo", "email": "oconnor@hospital.com", "desc": "Apostrophes"},
        {"fn": "Anne-Marie", "ln": "Saint-Claire", "email": "annemarie@hospital.com", "desc": "Hyphens"},
        {"fn": "Dr. René", "ln": "Müller-Nuñez", "email": "rene@hospital.com", "desc": "Unicode & accents"},
        {"fn": "<script>alert(1)</script>", "ln": "SQL' -- ", "email": "xss_sql@hospital.com", "desc": "XSS / SQL injection strings"}
    ]

    edge_passes = 0
    for ec in edge_cases:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Employee WHERE Email = %s", (ec["email"],))
            cursor.execute("DELETE FROM App_User WHERE Email = %s", (ec["email"],))

        p = {
            "first_name": ec["fn"],
            "last_name": ec["ln"],
            "gender": "Female",
            "job_title": "Receptionist",
            "phone": "0766666666",
            "email": ec["email"],
            "dept_id": 1
        }
        r5 = requests.post(f"{BASE_URL}/employees", json=p, headers=headers)
        if r5.status_code == 201:
            emp_id = r5.json().get("emp_id")
            # Verify retrieval via GET
            r_get = requests.get(f"{BASE_URL}/employees/{emp_id}", headers=headers)
            if r_get.status_code == 200 and r_get.json().get("data", {}).get("First_Name") == ec["fn"]:
                edge_passes += 1
            else:
                print(f"       GET verification failed for {ec['desc']}: {r_get.text}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/employees/{emp_id}", headers=headers)
        else:
            print(f"       POST failed for {ec['desc']}: HTTP {r5.status_code} {r5.text}")

    log_res("5. Edge Case Characters (Names, Apostrophes, Hyphens, Special Chars)", edge_passes == len(edge_cases),
            f"{edge_passes}/{len(edge_cases)} edge case payloads succeeded POST and verified via GET")

    print("")

    # =========================================================================
    # TEST 6: Deletion of Non-Existent IDs
    # =========================================================================
    print("--- TEST 6: Deletion of Non-Existent IDs ---")
    r6_1 = requests.delete(f"{BASE_URL}/employees/999999", headers=headers)
    t6_1_pass = (r6_1.status_code == 404) and (r6_1.json().get("message") == "Employee not found")
    log_res("6A. DELETE Non-Existent Emp_ID (999999)", t6_1_pass, f"HTTP {r6_1.status_code}, Body: {r6_1.json()}")

    r6_2 = requests.delete(f"{BASE_URL}/employees/abc", headers=headers)
    t6_2_pass = (r6_2.status_code in [404, 400, 500])
    log_res("6B. DELETE Invalid Non-Numeric ID ('abc')", t6_2_pass, f"HTTP {r6_2.status_code}")

    print("")

    # =========================================================================
    # TEST 7: End-to-End User Provisioning & Authentication Verification
    # =========================================================================
    print("--- TEST 7: Auto-Provisioned User Login Verification ---")
    prov_email = "prov_receptionist@hospital.com"
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM Employee WHERE Email = %s", (prov_email,))
        cursor.execute("DELETE FROM App_User WHERE Email = %s", (prov_email,))

    prov_payload = {
        "first_name": "ProvUser",
        "last_name": "Receptionist",
        "gender": "Female",
        "job_title": "Receptionist",
        "phone": "0777777777",
        "email": prov_email,
        "dept_id": 1
    }
    r7_post = requests.post(f"{BASE_URL}/employees", json=prov_payload, headers=headers)
    if r7_post.status_code == 201:
        prov_user = r7_post.json().get("username")
        prov_pass = r7_post.json().get("credentials", {}).get("password")
        emp_id = r7_post.json().get("emp_id")

        # Attempt login as provisioned user
        r7_login = requests.post(f"{BASE_URL}/auth/login", json={"username": prov_user, "password": prov_pass})
        t7_login_pass = (r7_login.status_code == 200) and (r7_login.json().get("user", {}).get("role") == "Receptionist")

        # Cleanup via DELETE /api/employees/:id
        r7_del = requests.delete(f"{BASE_URL}/employees/{emp_id}", headers=headers)
        
        # Verify login after deletion fails
        r7_login_after = requests.post(f"{BASE_URL}/auth/login", json={"username": prov_user, "password": prov_pass})
        t7_del_pass = (r7_login_after.status_code == 401)

        log_res("7. Provisioned User Login & Deletion Authentication Check", t7_login_pass and t7_del_pass,
                f"Login before delete: HTTP {r7_login.status_code} (Role: {r7_login.json().get('user', {}).get('role')}), Login after delete: HTTP {r7_login_after.status_code}")
    else:
        log_res("7. Provisioned User Login & Deletion Authentication Check", False, f"POST failed: HTTP {r7_post.status_code} {r7_post.text}")

    conn.close()

    print("\n==========================================================")
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r["success"])
    print(f"  SUMMARY: {passed_tests}/{total_tests} Tests Passed")
    print("==========================================================\n")
    return results

if __name__ == "__main__":
    run_tests()
