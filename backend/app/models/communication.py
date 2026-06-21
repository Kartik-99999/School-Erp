from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class Notice(Base):
    __tablename__ = "notices"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    attachment_url = Column(Text)
    is_pinned = Column(Boolean, default=False)
    category = Column(String(50), nullable=False, server_default="Notice")  # Notice | Circular
    target_audience = Column(String(50), nullable=False)  # All, Staff, Parents, Specific Class
    target_class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class MessageLog(Base):
    __tablename__ = "messages_log"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    channel = Column(String(50), nullable=False)  # WhatsApp, Email
    recipient_type = Column(String(50), nullable=False)  # Parents, Staff
    recipient_count = Column(Integer, default=1)
    message_content = Column(Text, nullable=False)
    status = Column(String(50), default="Sent")
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    event_type = Column(String(50), nullable=False)  # Holiday, Exam, PTM, Activity
    target_audience = Column(String(50), default="All")
    send_reminder = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Poll(Base):
    __tablename__ = "polls"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    question = Column(Text, nullable=False)
    target_audience = Column(String(50), nullable=False, server_default="All")  # All, Students, Parents, Staff
    is_active = Column(Boolean, default=True)
    closes_at = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    is_deleted = Column(Boolean, default=False)


class PollOption(Base):
    __tablename__ = "poll_options"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    poll_id = Column(UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    position = Column(Integer, default=0)


class PollVote(Base):
    __tablename__ = "poll_votes"
    __table_args__ = (UniqueConstraint("poll_id", "user_id", name="uq_poll_vote_user"),)
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    poll_id = Column(UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(
        UUID(as_uuid=True), ForeignKey("poll_options.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Gallery(Base):
    __tablename__ = "galleries"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    cover_url = Column(Text)
    event_date = Column(Date)
    target_audience = Column(String(50), nullable=False, server_default="All")
    is_published = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    is_deleted = Column(Boolean, default=False)


class GalleryPhoto(Base):
    __tablename__ = "gallery_photos"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    gallery_id = Column(
        UUID(as_uuid=True), ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False
    )
    image_url = Column(Text, nullable=False)
    caption = Column(String(255))
    position = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
