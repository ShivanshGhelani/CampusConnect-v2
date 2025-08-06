#!/usr/bin/env python3
"""
Simple password hasher for manual database update
"""

import bcrypt

# The plain text password from the database
plain_password = "k%$3!CroG1Gq"

# Convert to bytes
password_bytes = plain_password.encode('utf-8')

# Generate salt and hash
salt = bcrypt.gensalt(rounds=12)
hashed_password = bcrypt.hashpw(password_bytes, salt)

# Convert back to string
hashed_string = hashed_password.decode('utf-8')

print("🔐 Password Hashing Results:")
print(f"Original: {plain_password}")
print(f"Hashed: {hashed_string}")
print(f"Length: {len(hashed_string)}")

# Verify the hash works
is_valid = bcrypt.checkpw(password_bytes, hashed_password)
print(f"Verification: {'✅ SUCCESS' if is_valid else '❌ FAILED'}")

print(f"\n📝 Manual Database Update Command:")
print(f"db.users.updateOne(")
print(f'  {{ "username": "EMP001" }},')
print(f'  {{ "$set": {{ "password": "{hashed_string}" }} }}')
print(f")")
