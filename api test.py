import yfinance as yf

ticker = yf.Ticker("AAPL")
income_statement = ticker.financials
quarterly_income = ticker.get_income_stmt(freq='quarterly')
ebitda = quarterly_income.loc['EBITDA']

ebitda_last_4 = ebitda.iloc[:4]

print("EBITDA for the past 4 quarters:")
print(ebitda_last_4)
