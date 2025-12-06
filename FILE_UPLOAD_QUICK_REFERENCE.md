# 🖼️ File Upload Quick Reference

## Endpoints Available

### 1️⃣ Business Logo Upload
```
PATCH /api/businesses/:businessId
Content-Type: multipart/form-data

Fields:
- logo (file) - Business logo image
- name (optional) - Business name
- description (optional) - Business description
- ... any other business fields
```

**Example (cURL)**:
```bash
curl -X PATCH http://localhost:3000/api/businesses/660f1a2b3c4d5e6f7g8h9i0j \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@business-logo.png" \
  -F "name=My Company"
```

**Success Response**:
```json
{
  "status": "success",
  "data": {
    "_id": "660f1a2b3c4d5e6f7g8h9i0j",
    "name": "My Company",
    "logoUrl": "/images/business-logos/business-logo-1234567890-987654321.png"
  }
}
```

---

### 2️⃣ Worker Profile Image Upload
```
PATCH /api/workers/me
Content-Type: multipart/form-data

Fields:
- profileImage (file) - Worker profile photo
- firstName (optional) - First name
- lastName (optional) - Last name
- phone (optional) - Phone number
- bio (optional) - Worker bio
- ... any other profile fields
```

**Example (cURL)**:
```bash
curl -X PATCH http://localhost:3000/api/workers/me \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -F "profileImage=@profile.jpg" \
  -F "firstName=John" \
  -F "bio=Experienced worker"
```

**Success Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "660f1a2b3c4d5e6f7g8h9i0j",
      "firstName": "John"
    },
    "profile": {
      "profilePicture": "/images/worker-profiles/worker-profile-1234567890-987654321.jpg"
    }
  }
}
```

---

## File Access URLs

After upload, access files at:

```
Business Logo:    http://localhost:3000/images/business-logos/[filename]
Worker Profile:   http://localhost:3000/images/worker-profiles/[filename]
```

---

## Specifications

| Feature | Business Logo | Worker Profile |
|---------|---------------|-----------------|
| Endpoint | `PATCH /api/businesses/:id` | `PATCH /api/workers/me` |
| Field Name | `logo` | `profileImage` |
| Max Size | 5MB | 10MB |
| File Types | JPEG, PNG, GIF, WebP | JPEG, PNG, GIF, WebP |
| Storage | `public/images/business-logos/` | `public/images/worker-profiles/` |
| Auth Required | ✅ Employer | ✅ Worker |

---

## Error Responses

**File Too Large**:
```json
{
  "status": "error",
  "message": "File size is too large. Maximum file size allowed is 5MB for business logos and 10MB for worker profiles."
}
```

**Invalid File Type**:
```json
{
  "status": "error",
  "message": "Only image files are allowed. Received: application/pdf"
}
```

**No Authentication**:
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```

---

## JavaScript/Fetch Example

```javascript
// Business Logo Upload
async function uploadBusinessLogo(businessId, logoFile, token) {
  const formData = new FormData();
  formData.append('logo', logoFile);
  formData.append('name', 'New Name');
  
  const response = await fetch(
    `http://localhost:3000/api/businesses/${businessId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  return await response.json();
}

// Worker Profile Upload
async function uploadWorkerProfile(profileImageFile, token) {
  const formData = new FormData();
  formData.append('profileImage', profileImageFile);
  formData.append('firstName', 'John');
  formData.append('bio', 'My bio');
  
  const response = await fetch(
    'http://localhost:3000/api/workers/me',
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  return await response.json();
}

// Usage
const logoFile = document.querySelector('input[name="logo"]').files[0];
const result = await uploadBusinessLogo('businessId', logoFile, 'token');
console.log(result.data.logoUrl); // Access the uploaded file path
```

---

## HTML Form Example

```html
<form enctype="multipart/form-data">
  <input type="file" name="profileImage" accept="image/*" required />
  <input type="text" name="firstName" placeholder="First Name" />
  <input type="text" name="lastName" placeholder="Last Name" />
  <button type="submit">Update Profile</button>
</form>

<script>
  document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const response = await fetch('http://localhost:3000/api/workers/me', {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: formData
    });
    
    const result = await response.json();
    if (result.status === 'success') {
      console.log('Profile updated!', result.data.profile.profilePicture);
    }
  });
</script>
```

---

## Testing with Postman

1. **Method**: PATCH
2. **URL**: `http://localhost:3000/api/businesses/:id` or `/api/workers/me`
3. **Auth Tab**:
   - Type: Bearer Token
   - Token: Your JWT token
4. **Body Tab**:
   - Select: form-data
   - Add: `logo` (File type)
   - Add: Any text fields you want to update
5. **Send**

---

## Storage Locations

```
Project Root/
└── public/
    └── images/
        ├── business-logos/
        │   ├── .gitkeep
        │   └── business-logo-[timestamp]-[random].[ext]
        └── worker-profiles/
            ├── .gitkeep
            └── worker-profile-[timestamp]-[random].[ext]
```

---

## ✅ Everything Working?

Run these checks:
```bash
# Verify setup
node verify-file-upload-setup.js

# Test setup
node test-file-upload-setup.js

# Start server
npm run dev
```

Then test with curl examples above!

---

## 📚 See Also

- `FILE_UPLOAD_API.md` - Complete API documentation
- `FILE_UPLOAD_SETUP.md` - Implementation details