@echo off
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
%MYSQL% -u root --password=12345678 -e "DROP DATABASE IF EXISTS Hospital_Management_System;" 2>&1
echo Dropped. Importing...
%MYSQL% -u root --password=12345678 < "D:\Hospital MYSQL Databse\Hospital_Management_System.sql" 2>&1
echo Import exit code: %ERRORLEVEL%
%MYSQL% -u root --password=12345678 Hospital_Management_System -e "SELECT 'APPTS',COUNT(*) FROM Appointment UNION ALL SELECT 'COMPLETED',COUNT(*) FROM Appointment WHERE Appointment_Status='Completed' UNION ALL SELECT 'BILLS',COUNT(*) FROM Bill UNION ALL SELECT 'OPEN_SLOTS',COUNT(*) FROM Appointment_Slot WHERE Status='Open';" 2>&1
