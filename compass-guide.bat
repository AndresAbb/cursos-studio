@echo off
:: =============================================================================
:: CursosStudio — MongoDB Compass connection guide
:: Database: cursos_studio  |  Host: localhost:27017
:: =============================================================================
:: WHY COMPASS SHOWS EMPTY
:: -----------------------
:: Compass often connects to the default "test" database or the last-used URI.
:: The app's database (cursos_studio) only exists once at least one document has
:: been written, so Compass must be pointed at it explicitly.
:: =============================================================================

echo.
echo  1. VERIFY THE SERVER IS RUNNING
echo  --------------------------------
echo  The Express server must be up so Mongoose creates the DB on first use.
echo  In a separate terminal run:
echo.
echo    node server/index.js
echo.
echo  You should see:
echo    MongoDB connected
echo    Server running on port 3000
echo.

echo  2. CONFIRM DATA EXISTS IN THE TERMINAL
echo  ---------------------------------------
echo  Run these mongosh commands to verify collections before opening Compass:
echo.
echo    mongosh
echo    use cursos_studio
echo    show collections
echo    db.courses.countDocuments()
echo    db.courses.findOne()
echo.

echo  3. CONNECT COMPASS TO THE RIGHT DATABASE
echo  -----------------------------------------
echo  Open MongoDB Compass and use this exact connection string:
echo.
echo    mongodb://localhost:27017/cursos_studio
echo.
echo  Steps inside Compass:
echo    a) Click "New Connection" (top-left)
echo    b) Paste the URI above into the connection string field
echo    c) Click "Connect"
echo    d) In the left panel, expand "cursos_studio"
echo    e) Click any collection (courses, modules, notes, etc.)
echo.
echo  If Compass connected before without the DB name, it may show the old URI.
echo  Edit it and add "/cursos_studio" after the port number.
echo.

echo  4. COLLECTIONS TO EXPECT
echo  -------------------------
echo  courses        externalcourses   ghostcourses
echo  modules        notes             stickers
echo  exams          skills            friends
echo  settings
echo.

echo  5. USEFUL COMPASS FILTERS (paste into the Filter bar)
echo  -------------------------------------------------------
echo  All courses:                     {}
echo  Active courses only:             { "status": "active" }
echo  Courses with endDate set:        { "endDate": { "$exists": true } }
echo  Notes for a course (by id):      { "course": ObjectId("PASTE_ID_HERE") }
echo  Skills with a specific name:     { "name": { "$regex": "python", "$options": "i" } }
echo.

echo  6. IF COMPASS STILL SHOWS EMPTY AFTER CONNECTING CORRECTLY
echo  ------------------------------------------------------------
echo  a) Click the refresh icon (circular arrow) next to the database list
echo  b) Disconnect and reconnect — Compass caches the schema on first load
echo  c) Check you are NOT connected to mongodb://localhost:27017 (no DB suffix);
echo     that root view lists databases but may collapse empty-looking ones.
echo  d) Run this in mongosh to confirm the DB is non-empty:
echo.
echo       db.adminCommand({ listDatabases: 1 })
echo.
echo  The cursos_studio entry must show a non-zero sizeOnDisk value.
echo  If sizeOnDisk is 0, the app has not written any data yet — open the app
echo  in the browser (http://localhost:3000) and create at least one course.
echo.

pause
