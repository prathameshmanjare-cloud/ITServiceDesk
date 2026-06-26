from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.models.comment import Comment
from app.models.notification import Notification, NotificationType
from app.services.auth_service import hash_password
from app.utils.helpers import generate_ticket_number, calculate_due_date
from datetime import datetime, timedelta
import random

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(User).first():
        print("Database already seeded.")
        return

    admin = User(
        email="admin@company.com",
        full_name="Admin User",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.admin,
        department="IT",
        is_active=True
    )
    db.add(admin)

    agents = []
    for i in range(1, 4):
        agent = User(
            email=f"agent{i}@company.com",
            full_name=f"Agent {i}",
            hashed_password=hash_password("Agent@123"),
            role=UserRole.agent,
            department=random.choice(["IT", "Support", "Infrastructure"]),
            is_active=True
        )
        db.add(agent)
        agents.append(agent)

    users = []
    for i in range(1, 6):
        user = User(
            email=f"user{i}@company.com",
            full_name=f"User {i}",
            hashed_password=hash_password("User@123"),
            role=UserRole.user,
            department=random.choice(["Engineering", "Sales", "Marketing", "HR", "Finance"]),
            is_active=True
        )
        db.add(user)
        users.append(user)

    db.commit()

    categories = [c.value for c in TicketCategory]
    priorities = [p.value for p in TicketPriority]
    statuses = [s.value for s in TicketStatus]

    ticket_templates = [
        ("Cannot access email", "I am unable to access my email account since this morning. It shows authentication error.", "email"),
        ("Printer not working on floor 3", "The printer on the third floor is not responding. We have tried restarting it.", "printer"),
        ("VPN connection drops frequently", "VPN connection keeps dropping every 5-10 minutes making it impossible to work.", "network"),
        ("Request for new laptop", "I need a new laptop for the new joiner in our team starting next week.", "hardware"),
        ("Database connection timeout", "Our application is getting database connection timeout errors intermittently.", "software"),
        ("Password reset needed", "I forgot my password and cannot login to the system. Need immediate reset.", "access"),
        ("Security vulnerability report", "I found a potential security vulnerability in the login page.", "security"),
        ("Software installation request", "Need Adobe Creative Suite installed on my workstation for design work.", "software"),
        ("Network switch replacement", "The network switch in the server room is making unusual noises.", "network"),
        ("New user account creation", "Please create accounts for 3 new hires joining next Monday.", "access"),
        ("Email not syncing on mobile", "Outlook mobile app stopped syncing emails since the latest update.", "email"),
        ("Server disk space critical", "Production server disk space is at 95%. Need immediate cleanup or expansion.", "software"),
        ("WiFi connectivity issues", "WiFi in the conference room keeps disconnecting during meetings.", "network"),
        ("Monitor replacement request", "My monitor has dead pixels and needs replacement.", "hardware"),
        ("Printer toner replacement", "Printer in accounting department needs toner replacement urgently.", "printer"),
        ("API integration failure", "The third-party API integration stopped working after their latest update.", "software"),
        ("Keyboard and mouse not working", "My wireless keyboard and mouse stopped responding. Batteries replaced.", "hardware"),
        ("File server access denied", "Getting access denied error when trying to access the shared drive.", "access"),
        ("Email spam filter issue", "Legitimate emails from clients are going to spam folder.", "email"),
        ("System backup failure", "The automated backup job has been failing for the past 2 days.", "software"),
    ]

    sample_tickets = []
    for i, (title, desc, cat) in enumerate(ticket_templates):
        priority = random.choice(priorities)
        status = random.choice(statuses)
        created_by = random.choice(users).id
        assigned_to = random.choice([None, random.choice(agents).id, admin.id])
        due_date = calculate_due_date(priority)

        if i < 5:
            due_date = datetime.utcnow() - timedelta(hours=random.randint(1, 10))

        ticket = Ticket(
            ticket_number=generate_ticket_number(),
            title=title,
            description=desc,
            category=cat,
            priority=priority,
            status=status,
            created_by=created_by,
            assigned_to=assigned_to,
            department=random.choice(["Engineering", "Sales", "Marketing", "HR", "Finance"]),
            due_date=due_date,
            resolved_at=datetime.utcnow() - timedelta(days=random.randint(1, 5)) if status in ["resolved", "closed"] else None,
            closed_at=datetime.utcnow() - timedelta(days=random.randint(1, 3)) if status == "closed" else None,
        )
        db.add(ticket)
        sample_tickets.append(ticket)

    db.commit()

    for ticket in sample_tickets[:10]:
        comment = Comment(
            ticket_id=ticket.id,
            user_id=random.choice(agents).id,
            content="We are looking into this issue. Will update you shortly.",
            is_internal=False
        )
        db.add(comment)

        comment2 = Comment(
            ticket_id=ticket.id,
            user_id=random.choice(users).id,
            content="Thank you for the update. Please let me know if you need any more information.",
            is_internal=False
        )
        db.add(comment2)

    db.commit()

    for user in users + agents:
        notif = Notification(
            user_id=user.id,
            title="Welcome to IT Service Desk",
            message="Your account has been created. You can now submit and track tickets.",
            type=NotificationType.ticket_created,
            is_read=False
        )
        db.add(notif)

    notif2 = Notification(
        user_id=agents[0].id,
        title="Ticket Assigned",
        message="Ticket TKT-202501-0001 has been assigned to you.",
        type=NotificationType.ticket_assigned,
        ticket_id=sample_tickets[0].id,
        is_read=False
    )
    db.add(notif2)

    notif3 = Notification(
        user_id=admin.id,
        title="SLA Breach Warning",
        message="Ticket TKT-202501-0003 is about to breach SLA.",
        type=NotificationType.sla_breach,
        ticket_id=sample_tickets[2].id,
        is_read=False
    )
    db.add(notif3)

    db.commit()
    db.close()
    print("Database seeded successfully!")
    print("Admin: admin@company.com / Admin@123")
    print("Agents: agent1-3@company.com / Agent@123")
    print("Users: user1-5@company.com / User@123")

if __name__ == "__main__":
    seed()
