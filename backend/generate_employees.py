import csv
import random
from datetime import datetime, timedelta

departments = [
    "Mathematics",
    "Science",
    "English",
    "Physical Education",
    "Administration",
    "IT",
    "Arts",
]
designations = [
    "Teacher",
    "Senior Teacher",
    "Head of Department",
    "Administrator",
    "IT Staff",
    "Clerk",
    "Coordinator",
]
genders = ["Male", "Female"]

first_names = [
    "John",
    "Jane",
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Ethan",
    "Fiona",
    "George",
    "Hannah",
    "Ian",
    "Julia",
    "Kevin",
    "Laura",
    "Michael",
    "Nina",
    "Oliver",
    "Paula",
    "Quinn",
    "Rachel",
    "Sam",
    "Tina",
    "Ursula",
    "Victor",
    "Wendy",
    "Xavier",
    "Yvonne",
    "Zack",
    "Aaron",
    "Betty",
    "Carl",
    "Doris",
    "Evan",
    "Fay",
    "Greg",
    "Helen",
    "Ivan",
    "Joy",
    "Kyle",
    "Lily",
]

last_names = [
    "Smith",
    "Johnson",
    "Williams",
    "Jones",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Martin",
    "Thompson",
    "Garcia",
    "Martinez",
    "Robinson",
    "Clark",
    "Rodriguez",
    "Lewis",
    "Lee",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "Hernandez",
    "King",
]

output_file = "/Users/kartikbhardwaj/Desktop/100_Employees.csv"

with open(output_file, mode="w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(
        [
            "first_name",
            "last_name",
            "email",
            "employee_id",
            "designation",
            "department",
            "gender",
            "phone",
            "basic_salary",
            "date_of_joining",
        ]
    )

    for i in range(1, 101):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        email = f"{fn.lower()}.{ln.lower()}{i}@school.edu"
        emp_id = f"EMP{str(i).zfill(3)}"
        dept = random.choice(departments)
        desig = random.choice(designations)
        gender = random.choice(genders)
        phone = (
            f"555-01{str(random.randint(0, 99)).zfill(2)}-{str(random.randint(0, 9999)).zfill(4)}"
        )
        salary = random.randint(40000, 90000)

        # Random join date in the last 5 years
        days_ago = random.randint(0, 5 * 365)
        join_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

        writer.writerow([fn, ln, email, emp_id, desig, dept, gender, phone, salary, join_date])

print(f"Successfully generated 100 employee records to {output_file}")
