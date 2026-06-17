from app.crud.base import CRUDBase
from app.models.communication import Event, MessageLog, Notice


class CRUDSimple(CRUDBase):
    pass


crud_notice = CRUDSimple(Notice)
crud_message_log = CRUDSimple(MessageLog)
crud_event = CRUDSimple(Event)
