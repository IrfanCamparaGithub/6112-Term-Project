from sqlalchemy import create_engine, MetaData, Table
from databases import Database

User_Database_URL = "mysql+mysqlconnector://root:password@127.0.0.1:3306/6112_Term_Project"
database = Database(User_Database_URL)
engine = create_engine(User_Database_URL)
metadata = MetaData()