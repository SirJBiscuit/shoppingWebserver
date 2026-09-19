# Beta Tester Registration Flow 🧪

## Updated System with Display Name

### **Two Identifiers System**

**1. Username (System Identifier)**
- Used for login
- Must be unique
- Example: `beta_user_123`, `test_account_456`

**2. Nickname (Display Name)**
- Shown to admins and in feedback
- Helps identify beta testers
- Can be anything you want
- Example: `John`, `Sarah`, `Mike`, `TechGuru`, `BetaTester01`

---

## 📋 Registration Flow

### **Step 1: Beta Code Entry**
```
┌─────────────────────────────────────┐
│  🧪 Beta Testing Access             │
│                                     │
│  Enter your beta code phrase:       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ BLUE-2024-A7K9M             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Verify Code ]  [ Cancel ]        │
└─────────────────────────────────────┘
```

### **Step 2: Create Account**
```
┌─────────────────────────────────────┐
│  Create Your Beta Account           │
│                                     │
│  Username (for login):              │
│  ┌─────────────────────────────┐   │
│  │ beta_john_123               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Nickname:                          │
│  ┌─────────────────────────────┐   │
│  │ John                        │   │
│  └─────────────────────────────┘   │
│                                     │
│  Password:                          │
│  ┌─────────────────────────────┐   │
│  │ ••••••••                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Confirm Password:                  │
│  ┌─────────────────────────────┐   │
│  │ ••••••••                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Next ]                            │
└─────────────────────────────────────┘
```

### **Step 3: Location Data**
```
┌─────────────────────────────────────┐
│  Location Information               │
│                                     │
│  Country:                           │
│  ┌─────────────────────────────┐   │
│  │ United States ▼             │   │
│  └─────────────────────────────┘   │
│                                     │
│  State:                             │
│  ┌─────────────────────────────┐   │
│  │ California ▼                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Next ]                            │
└─────────────────────────────────────┘
```

### **Step 4: Data Policy**
```
┌─────────────────────────────────────┐
│  Data Usage Policy                  │
│                                     │
│  ℹ️ How We Use Your Data            │
│                                     │
│  Your location data will ONLY be    │
│  used for training our store        │
│  database and improving predictions.│
│                                     │
│  ☑ I understand and agree           │
│                                     │
│  [ Create Account ]  [ Cancel ]     │
└─────────────────────────────────────┘
```

---

## 🎯 Admin View

### **Beta Tester List**
```
┌─────────────────────────────────────────────────────┐
│  Beta Testers (12 active)                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ John (Nickname)                               │ │
│  │ Username: beta_john_123                       │ │
│  │ Joined: 5 days ago • Expires: 25 days        │ │
│  │ Location: California, USA                     │ │
│  │ Feedback: 3 submissions • Activity: High     │ │
│  │                                               │ │
│  │ [ 💙 Send Thanks ] [ Convert to User ]       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Sarah_TestUser                                │ │
│  │ Username: test_sarah_456                      │ │
│  │ Joined: 12 days ago • Expires: 18 days       │ │
│  │ Location: New York, USA                       │ │
│  │ Feedback: 7 submissions • Activity: Very High│ │
│  │                                               │ │
│  │ [ 💙 Send Thanks ] [ Convert to User ]       │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### **Feedback View**
```
┌─────────────────────────────────────────────────────┐
│  Beta Feedback                                       │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🐛 CRITICAL - Items disappearing              │ │
│  │ From: John from California                    │ │
│  │ Username: beta_john_123                       │ │
│  │ 2 days ago • Status: In Progress              │ │
│  │                                               │ │
│  │ "When I add items and refresh the page..."   │ │
│  │                                               │ │
│  │ [ View Details ] [ Mark Fixed ] [ Reply ]    │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Database Structure

### **beta_testers Table**
```sql
CREATE TABLE beta_testers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  beta_code_id INTEGER REFERENCES beta_testing_codes(id),
  beta_username VARCHAR(100) NOT NULL,        -- For login
  display_name VARCHAR(150) NOT NULL,         -- For admin identification
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  accepted_data_policy BOOLEAN DEFAULT false,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  feedback_count INTEGER DEFAULT 0
);
```

---

## 🔄 API Request/Response

### **Registration Request**
```json
POST /api/beta/register
{
  "code": "BLUE-2024-A7K9M",
  "username": "beta_john_123",
  "password": "securePassword123",
  "betaUsername": "beta_john_123",
  "displayName": "John from California",
  "country": "United States",
  "state": "California",
  "acceptedDataPolicy": true
}
```

### **Registration Response**
```json
{
  "message": "Beta account created successfully",
  "user": {
    "id": 42,
    "username": "beta_john_123",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## ✅ Benefits of Display Name

### **For Admins:**
- ✅ Easily identify beta testers in feedback
- ✅ More context about tester (location, role, etc.)
- ✅ Better communication
- ✅ Easier to track specific testers

### **For Beta Testers:**
- ✅ Can use descriptive names
- ✅ Privacy (username separate from display name)
- ✅ Flexibility in identification

### **Examples of Good Display Names:**
- `John - iOS Tester`
- `Sarah from NYC`
- `Mike_DevTeam`
- `TestUser_California`
- `Beta_Tester_001`

---

## 🎨 UI Components Needed

### **Frontend Components:**
1. ✅ BetaCodeModal - Code entry
2. ✅ BetaRegistrationFlow - Multi-step registration
3. ✅ BetaAccountForm - Username + Display Name inputs
4. ✅ LocationForm - Country + State selection
5. ✅ DataPolicyConsent - Policy agreement

### **Admin Components:**
6. ✅ BetaTesterList - Shows display names
7. ✅ BetaTesterDetails - Full tester info
8. ✅ FeedbackList - Shows display names in feedback

---

## 🔒 Validation Rules

### **Username:**
- 3-50 characters
- Alphanumeric + underscores
- Must be unique
- Case-insensitive

### **Display Name:**
- 2-150 characters
- Can include spaces and special characters
- More flexible than username
- Shown to admins only

### **Example Validation:**
```javascript
// Username validation
const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

// Display name validation (more flexible)
const displayNameRegex = /^.{2,150}$/;
```

---

## 📊 Search & Filter

### **Admin Can Search By:**
- Display name (primary)
- Username (secondary)
- Location (country/state)
- Feedback count
- Activity level

### **Example Search Query:**
```sql
SELECT * FROM beta_testers
WHERE 
  display_name ILIKE '%John%' OR
  beta_username ILIKE '%John%' OR
  country ILIKE '%United%' OR
  state ILIKE '%California%'
ORDER BY feedback_count DESC;
```

---

## 🎯 Summary

**Two-Identifier System:**
1. **Username** - Technical, for login
2. **Display Name** - Human-readable, for admin identification

**Benefits:**
- Better admin experience
- Easier tester identification
- More context in feedback
- Flexible naming options

**Implementation:**
- ✅ Database updated
- ✅ API updated
- ✅ Feedback system updated
- ⏳ Frontend components (next step)

---

**Ready to build the frontend components!** 🚀
