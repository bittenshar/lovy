# Vercel Deployment with Cloudinary

## Overview
The application supports both local file storage (localhost) and Cloudinary (Vercel/Production).

- **Localhost**: Files stored in `/public/images/` directory
- **Vercel/Production**: Files stored on Cloudinary (serverless-safe)

## Setup Cloudinary

1. **Create a Cloudinary Account**
   - Go to https://cloudinary.com/users/register/free
   - Sign up for free account
   - Dashboard → API Keys section

2. **Get Your Credentials**
   - Cloud Name
   - API Key
   - API Secret

## Environment Variables for Vercel

Add these to your Vercel project settings:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Optionally:
```
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

## How It Works

The upload middleware automatically detects the environment:

- **Development (localhost)**: Uses local disk storage
- **Production (Vercel)**: Uses Cloudinary

## Testing

### Local Testing
```bash
npm run dev
```
- Upload business logo: Files go to `/public/images/business-logos/`
- Access at: `http://localhost:3000/images/business-logos/filename.jpg`

### Vercel Testing
- Upload business logo: Files go to Cloudinary
- Access via: Cloudinary URL (e.g., `https://res.cloudinary.com/...`)

## File Paths in Database

The `logoUrl` field in the database will contain:
- **Local**: Relative path like `/images/business-logos/business-logo-1765039957954-123456.jpeg`
- **Cloudinary**: Full URL like `https://res.cloudinary.com/cloud/image/upload/v123/business-logos/file.jpg`

## Benefits

✅ Works on both localhost and Vercel  
✅ No file system dependencies  
✅ Automatic CDN distribution via Cloudinary  
✅ Unlimited bandwidth on Cloudinary free tier  
✅ Automatic image optimization
