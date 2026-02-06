from .auth import Authentication
from .comments import Comments
from .note import Note
from .user import User

class APIModule:
    def __init__(self, __session):
        self.auth = Authentication(__session)
        self.comments = Comments(__session)
        self.note = Note(__session)
        self.user = User(__session)
