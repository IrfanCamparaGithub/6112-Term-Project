from pydantic import BaseModel, Field

class Make_New_User(BaseModel):
    name: str
    password: str

class Existing_User_Login(BaseModel):
    name: str
    password: str
