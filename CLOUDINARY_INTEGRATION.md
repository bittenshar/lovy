# Cloudinary Integration Guide

## Overview
The backend now supports full Cloudinary integration with automatic image optimization for both business logos and worker profiles.

## Features

### Business Logo Optimization
- Auto format & quality selection
- Max size: 1000x1000px
- Automatic cropping with smart gravity
- WebP/AVIF format support

### Worker Profile Optimization
- Auto format & quality selection
- Max size: 500x500px
- Face detection & focus (gravity: 'face')
- Automatic thumb crop for perfect profiles
- WebP/AVIF format support

## Setup

### 1. Get Cloudinary Credentials
```
Cloud Name: dx0317z1p
API Key: 538279261343529
API Secret: (Check your Cloudinary dashboard)
```

### 2. Add Environment Variables

**For local development (.env):**
```env
CLOUDINARY_CLOUD_NAME=dx0317z1p
CLOUDINARY_API_KEY=538279261343529
CLOUDINARY_API_SECRET=your_api_secret_here
```

**For Vercel (Settings → Environment Variables):**
```
CLOUDINARY_CLOUD_NAME=dx0317z1p
CLOUDINARY_API_KEY=538279261343529
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 3. Install Dependencies
```bash
npm install cloudinary multer-storage-cloudinary
```

## How It Works

### Upload Flow
1. User uploads image in Postman or app
2. Multer intercepts the upload
3. File is automatically uploaded to Cloudinary with optimization params
4. Cloudinary returns optimized URL
5. URL is stored in database

### Automatic Optimizations
- **Format**: Auto (WebP/AVIF for modern browsers, fallback to original)
- **Quality**: Auto (optimal balance between quality and file size)
- **Responsive**: Optimized for different screen sizes
- **Lazy Loading**: Works with most lazy load libraries

### Get Different Image Sizes

Use the `cloudinaryHelper.js` utility:

```javascript
const { getThumbnailUrl } = require('../../shared/utils/cloudinaryHelper');

// Small thumbnail (60x60)
const smallUrl = getThumbnailUrl(publicId, 'small');

// Medium thumbnail (200x200)
const mediumUrl = getThumbnailUrl(publicId, 'medium');

// Large thumbnail (500x500)
const largeUrl = getThumbnailUrl(publicId, 'large');
```

## API Endpoints

### Upload Business Logo
```bash
curl -X PATCH http://localhost:3000/api/businesses/{businessId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/logo.jpg" \
  -F "name=Business Name"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "logoUrl": "https://res.cloudinary.com/dx0317z1p/image/upload/v123/business-logos/business-logo-1234567890-987654321.jpg",
    "logoLocalPath": "https://res.cloudinary.com/dx0317z1p/image/upload/v123/business-logos/business-logo-1234567890-987654321.jpg"
  }
}
```

### Upload Worker Profile
```bash
curl -X PATCH http://localhost:3000/api/workers/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileImage=@/path/to/profile.jpg" \
  -F "firstName=John" \
  -F "lastName=Doe"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "profilePicture": "https://res.cloudinary.com/dx0317z1p/image/upload/v123/worker-profiles/worker-profile-1234567890-987654321.jpg"
    }
  }
}
```

## URL Parameters for Custom Transformations

You can use Cloudinary's URL API to get different variations:

**Thumbnail with quality control:**
```
https://res.cloudinary.com/dx0317z1p/image/upload/w_200,h_200,c_fill,q_auto,f_auto/business-logos/image.jpg
```

**Responsive image:**
```
https://res.cloudinary.com/dx0317z1p/image/upload/w_auto,dpr_auto,c_fill,q_auto,f_auto/business-logos/image.jpg
```

**Profile picture with face focus:**
```
https://res.cloudinary.com/dx0317z1p/image/upload/w_300,h_300,c_thumb,g_face,q_auto,f_auto/worker-profiles/image.jpg
```

## Benefits

✅ **No Server Storage**: Files stored in cloud, not on server filesystem  
✅ **Works on Vercel**: Serverless-safe, no ephemeral storage issues  
✅ **Automatic Optimization**: Smart format & quality selection  
✅ **Responsive**: Automatic DPR and width optimization  
✅ **Face Detection**: Worker profiles automatically focus on faces  
✅ **CDN**: Global CDN for fast delivery  
✅ **Unlimited Bandwidth**: Cloudinary free tier has unlimited bandwidth  
✅ **Image Manipulation**: Easy to add filters, effects, watermarks via URL

## Testing Locally

```bash
npm run dev
```

Then in Postman:
1. Upload image via PATCH /api/businesses/{id}
2. Check response for `logoUrl`
3. Copy URL and paste in browser to verify image loads

## Troubleshooting

**Issue: "Route not found" when accessing image**
- ✅ Fixed - Images now stored on Cloudinary, not local filesystem
- Images are accessible via Cloudinary CDN URLs

**Issue: Image upload fails**
- Check `CLOUDINARY_CLOUD_NAME` environment variable
- Check `CLOUDINARY_API_KEY` environment variable
- Verify API credentials are correct on https://cloudinary.com/console/

**Issue: Vercel deployment not working**
- Ensure env vars are set in Vercel project settings
- Restart the deployment after adding env vars

## Resources

- [Cloudinary Dashboard](https://cloudinary.com/console/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Image Transformation Guide](https://cloudinary.com/documentation/image_transformation_reference)
