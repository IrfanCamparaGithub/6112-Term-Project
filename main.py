from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from db import database, engine, metadata
from models import userInfo
from schemas import Make_New_User, Existing_User_Login

import yfinance as yf
import os

app = FastAPI(title="Alpha", version="1.0.0")
app.mount("/static", StaticFiles(directory="frontend"), name="static")

metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.on_event("startup")
async def startup():
    await database.connect()
@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")

@app.get("/ebitda/{ticker}")
def get_ebitda(ticker: str = "AAPL"):

    t = yf.Ticker(ticker)
    try:
        quarterlyEBITDA = t.get_income_stmt(freq="quarterly")
    except AttributeError:
        quarterlyEBITDA = t.quarterly_income_stmt

    if quarterlyEBITDA is None or quarterlyEBITDA.empty or "EBITDA" not in quarterlyEBITDA.index:
        return {"ticker": ticker.upper(), "ebitda_last_4": []}

    values = [float(x) for x in quarterlyEBITDA.loc["EBITDA"].iloc[:4].tolist()]
    return {"ticker": ticker.upper(), "ebitda_last_4": values}


@app.post("/register_user")
async def register_user(user_info: Make_New_User):
    query = userInfo.select().where(userInfo.c.name == userInfo.name)
    user_already_exists = await database.fetch_one(query)
    if user_already_exists:
        raise HTTPException(status_code=400, detail="User already exists within the database")
    hashPass = pwd_context.hash(userInfo.password)
    query = userInfo.insert().values(name = userInfo.name, password = hashPass)
    await database.execute(query)
    return {"message" : "Your account has been registered successfully"}


@app.post("/login_user")
async def login_user(user_info: Existing_User_Login):
    query = userInfo.select().where(userInfo.c.name == userInfo.name)
    user_already_exists = await database.fetch_one(query)
    if not user_already_exists:
        raise HTTPException(status_code=400, detail="User does not exist")

    if not pwd_context.verify(userInfo.password, user_already_exists["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    return {"message" : "You have successfully logged in"}

