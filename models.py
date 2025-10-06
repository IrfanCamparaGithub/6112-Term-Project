from sqlalchemy import Table, Column, String, Integer

from db import metadata

userInfo = Table('userInfo', metadata,Column('id', Integer, primary_key=True), Column('name', String(50), nullable=False, index = True, unique=True),
                 Column('password', String(300), nullable=False))