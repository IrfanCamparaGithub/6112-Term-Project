from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from db import database, engine, metadata
from models import userInfo
from schemas import Make_New_User, Existing_User_Login

import yfinance as yf
import os
import asyncio

app = FastAPI(title="Alpha", version="1.0.0")
app.mount("/static", StaticFiles(directory="frontend"), name="static")

metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


# Serve the main HTML file
@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")


# Serve other HTML files
@app.get("/main.html")
def read_main():
    return FileResponse("frontend/main.html")


# Serve JavaScript files
@app.get("/{filename}.js")
def read_js(filename: str):
    js_path = f"frontend/{filename}.js"
    if os.path.exists(js_path):
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="File not found")


# Helper function to get financial data
def get_financial_data(ticker: str):
    try:
        t = yf.Ticker(ticker)

        # Get quarterly income statement
        try:
            quarterly_data = t.get_income_stmt(freq="quarterly")
        except AttributeError:
            quarterly_data = t.quarterly_income_stmt

        if quarterly_data is None or quarterly_data.empty:
            return {
                "ticker": ticker.upper(),
                "revenue_last_4": [],
                "ebitda_last_4": [],
                "net_income_last_4": [],
                "error": "No financial data found"
            }

        # Extract revenue, EBITDA, and net income
        revenue_values = []
        ebitda_values = []
        net_income_values = []

        # Revenue (usually called "Total Revenue" or "Revenue")
        revenue_names = ['Total Revenue', 'Revenue', 'TotalRevenue']
        for name in revenue_names:
            if name in quarterly_data.index:
                revenue_values = [float(x) for x in quarterly_data.loc[name].iloc[:4].tolist()]
                break

        # EBITDA
        ebitda_names = ['EBITDA', 'Ebitda']
        for name in ebitda_names:
            if name in quarterly_data.index:
                ebitda_values = [float(x) for x in quarterly_data.loc[name].iloc[:4].tolist()]
                break

        # Net Income
        net_income_names = ['Net Income', 'Net Income Common Stockholders', 'NetIncome']
        for name in net_income_names:
            if name in quarterly_data.index:
                net_income_values = [float(x) for x in quarterly_data.loc[name].iloc[:4].tolist()]
                break

        return {
            "ticker": ticker.upper(),
            "revenue_last_4": revenue_values,
            "ebitda_last_4": ebitda_values,
            "net_income_last_4": net_income_values
        }

    except Exception as e:
        return {
            "ticker": ticker.upper(),
            "revenue_last_4": [],
            "ebitda_last_4": [],
            "net_income_last_4": [],
            "error": str(e)
        }


# Single ticker endpoint for all financial data
@app.get("/financials/{ticker}")
def get_financials(ticker: str = "AAPL"):
    return get_financial_data(ticker)


# Batch endpoint for multiple tickers
@app.get("/financials/batch/{tickers}")
async def get_batch_financials(tickers: str):
    ticker_list = [t.strip().upper() for t in tickers.split(',') if t.strip()]

    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided")

    loop = asyncio.get_event_loop()

    tasks = []
    for ticker in ticker_list:
        task = loop.run_in_executor(None, get_financial_data, ticker)
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    return results


# Keep old endpoints for compatibility
@app.get("/ebitda/{ticker}")
def get_ebitda(ticker: str = "AAPL"):
    data = get_financial_data(ticker)
    return {"ticker": data["ticker"], "ebitda_last_4": data["ebitda_last_4"]}


@app.post("/register_user")
async def register_user(user_info: Make_New_User):
    query = userInfo.select().where(userInfo.c.name == user_info.name)
    user_already_exists = await database.fetch_one(query)

    if user_already_exists:
        raise HTTPException(status_code=400, detail="User already exists within the database")

    hashPass = pwd_context.hash(user_info.password)
    query = userInfo.insert().values(name=user_info.name, password=hashPass)
    await database.execute(query)
    return {"message": "Your account has been registered successfully"}


@app.post("/login_user")
async def login_user(user_info: Existing_User_Login):
    query = userInfo.select().where(userInfo.c.name == user_info.name)
    user_already_exists = await database.fetch_one(query)

    if not user_already_exists:
        raise HTTPException(status_code=400, detail="User does not exist")

    if not pwd_context.verify(user_info.password, user_already_exists.password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    return {"message": "You have successfully logged in"}