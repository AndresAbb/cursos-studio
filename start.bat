@echo off
start /min docker start mongo
start /min npm start
start http://localhost:3000