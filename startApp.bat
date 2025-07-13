@echo off
start cmd /k "cd frontend && npm start"
start cmd /k "cd backend && .\campusconnect\Scripts\activate && uvicorn main:app --reload"
    