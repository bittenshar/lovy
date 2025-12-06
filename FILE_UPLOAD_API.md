# File Upload API Documentation

## Overview
The WorkConnect backend now supports file uploads for business logos and worker profile images using Multer. Files are stored locally in the `public/images/` directory with proper organization.

## File Directory Structure
```
public/
├── images/
│   ├── business-logos/     # Business logo uploads
│   └── worker-profiles/    # Worker profile image uploads
```

## File Upload Specifications

### Business Logo Upload
- **Endpoint**: `PATCH /api/businesses/:businessId`
- **Authentication**: Required (employer only)
- **File Parameter Name**: `logo`
- **Max File Size**: 5MB
- **Allowed Types**: JPEG, PNG, GIF, WebP
- **Storage Location**: `/public/images/business-logos/`

#### Request Example (cURL):
```bash
curl -X PATCH http://localhost:3000/api/businesses/660f1a2b3c4d5e6f7g8h9i0j \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/logo.png" \
  -F "name=My Business" \
  -F "description=Business description"
```

#### Request Example (JavaScript/Fetch):
```javascript
const formData = new FormData();
formData.append('logo', logoFile); // File object from input
formData.append('name', 'Business Name');
formData.append('description', 'Business description');

const response = await fetch(
  'http://localhost:3000/api/businesses/businessId',
  {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: formData
  }
);

const result = await response.json();
console.log(result.data.logoUrl); // Returns: /images/business-logos/business-logo-1234567890-123456789.png
```

#### Response Example:
```json
{
  "status": "success",
  "data": {
    "_id": "660f1a2b3c4d5e6f7g8h9i0j",
    "name": "My Business",
    "description": "Business description",
    "logoUrl": "/images/business-logos/business-logo-1702054800000-123456789.png",
    "logoLocalPath": "/images/business-logos/business-logo-1702054800000-123456789.png"
  }
}
```

---

### Worker Profile Image Upload
- **Endpoint**: `PATCH /api/workers/me`
- **Authentication**: Required (worker only)
- **File Parameter Name**: `profileImage`
- **Max File Size**: 10MB
- **Allowed Types**: JPEG, PNG, GIF, WebP
- **Storage Location**: `/public/images/worker-profiles/`

#### Request Example (cURL):
```bash
curl -X PATCH http://localhost:3000/api/workers/me \
  -H "Authorization: Bearer WORKER_TOKEN" \
  -F "profileImage=@/path/to/profile.jpg" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "phone=+919876543210" \
  -F "bio=Experienced worker"
```

#### Request Example (JavaScript/Fetch):
```javascript
const formData = new FormData();
formData.append('profileImage', profileImageFile); // File object from input
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('phone', '+919876543210');
formData.append('bio', 'Experienced worker');

const response = await fetch(
  'http://localhost:3000/api/workers/me',
  {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer WORKER_TOKEN'
    },
    body: formData
  }
);

const result = await response.json();
console.log(result.data.profile.profilePicture); // Returns: /images/worker-profiles/worker-profile-1234567890-123456789.jpg
```

#### Response Example:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "660f1a2b3c4d5e6f7g8h9i0j",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+919876543210"
    },
    "profile": {
      "_id": "660f1a2b3c4d5e6f7g8h9i0j",
      "user": "660f1a2b3c4d5e6f7g8h9i0j",
      "bio": "Experienced worker",
      "profilePicture": "/images/worker-profiles/worker-profile-1702054800000-123456789.jpg",
      "skills": [],
      "experience": null,
      "languages": []
    }
  }
}
```

---

## Accessing Uploaded Files

Once uploaded, files can be accessed via HTTP:

```
Business Logo:    http://localhost:3000/images/business-logos/business-logo-1702054800000-123456789.png
Worker Profile:   http://localhost:3000/images/worker-profiles/worker-profile-1702054800000-123456789.jpg
```

## Error Handling

### File Size Exceeded:
```json
{
  "status": "error",
  "message": "File size is too large. Maximum file size allowed is 5MB for business logos and 10MB for worker profiles."
}
```

### Invalid File Type:
```json
{
  "status": "error",
  "message": "Only image files are allowed. Received: application/pdf"
}
```

### No File Provided:
The API will still work - it just won't update the logo/profile image field.

### Upload Error:
```json
{
  "status": "error",
  "message": "Upload error: [specific error details]"
}
```

---

## Implementation Notes

1. **File Naming**: Files are automatically renamed with:
   - Timestamp (Date.now())
   - Random number (Math.random())
   - Original file extension preserved
   - Example: `business-logo-1702054800000-123456789.png`

2. **Stored in Database**:
   - Business: `logoUrl` and `logoLocalPath` fields
   - Worker Profile: `profilePicture` field

3. **Static File Serving**:
   - Express serves all images from `public/images/` directory
   - Accessible via `/images/` URL path

4. **Multer Configuration**:
   - Different upload middlewares for business and worker
   - Separate storage locations for organization
   - Image MIME type validation
   - File size limits enforced

5. **Integration with Existing APIs**:
   - No new endpoints created
   - File upload added to existing PATCH endpoints
   - Works alongside other fields in same request
   - Optional - other fields can be updated without files

---

## HTML Form Example

```html
<!-- Business Logo Upload Form -->
<form id="businessForm" enctype="multipart/form-data">
  <input type="file" name="logo" accept="image/*" />
  <input type="text" name="name" placeholder="Business Name" />
  <input type="text" name="description" placeholder="Description" />
  <button type="submit">Update Business</button>
</form>

<script>
  document.getElementById('businessForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const response = await fetch(
      'http://localhost:3000/api/businesses/businessId',
      {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN'
        },
        body: formData
      }
    );
    
    const result = await response.json();
    console.log(result);
  });
</script>
```

---

## Testing with Postman

1. **Create a new PATCH request**
2. **URL**: `http://localhost:3000/api/businesses/:businessId`
3. **Headers**: Add `Authorization: Bearer YOUR_TOKEN`
4. **Body**: Select "form-data"
5. **Add fields**:
   - Key: `logo`, Type: `File`, Value: Select image file
   - Key: `name`, Type: `text`, Value: Business name
   - Key: `description`, Type: `text`, Value: Description
6. **Send request**

---

## Security Considerations

✅ **Implemented**:
- MIME type validation (image/* only)
- File size limits enforced
- Authentication required
- Authorization checks (employer for business, worker for profile)
- Files stored outside web root with controlled access

---

## Future Enhancements

- Image optimization/compression (Sharp integration)
- Thumbnail generation
- Image deletion endpoint
- CDN/Cloud storage integration
- Multiple file upload support