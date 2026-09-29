# Storage System Deployment Guide

## **Quick Deployment Steps**

### **1. Commit and Push Changes**

```bash
git add -A
git commit -m "Integrate Storage System into Admin UI"
git push
```

### **2. Deploy to Production**

```bash
# SSH into your server
ssh user@shop.cloudmc.online

# Navigate to project
cd /opt/cloudmc-shop

# Pull latest changes
git pull

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# Watch logs for migration
docker-compose logs -f backend | grep "Admin Storage System"
```

### **3. Verify Deployment**

**Check Migration:**
```bash
# Should see: "✅ Admin Storage System migration completed"
docker-compose logs backend | grep "Admin Storage System"
```

**Check Database Tables:**
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt storage*"
```

Expected output:
```
 storage_access_log
 storage_analytics
 storage_files
 storage_quotas
```

**Check Storage Directories:**
```bash
docker exec shop_backend ls -la /app/storage/
```

Expected output:
```
drwxr-xr-x images
drwxr-xr-x sounds
drwxr-xr-x documents
drwxr-xr-x general
```

### **4. Test the System**

1. **Access Admin Page:**
   - Navigate to `https://shop.cloudmc.online/admin`
   - Login as admin
   - Click "Storage Management" tab

2. **Test Upload:**
   - Drag an image file onto upload zone
   - Verify file appears in grid
   - Check stats update

3. **Test Search:**
   - Upload multiple files
   - Search by filename
   - Filter by category

4. **Test Delete:**
   - Select a file
   - Click delete
   - Verify file removed

5. **Test Sidebar Link:**
   - Click "Storage Management" in sidebar
   - Verify it opens Admin page with Storage tab active

---

## **Troubleshooting**

### **Migration Doesn't Run**

```bash
# Check if migration file exists
docker exec shop_backend ls -la /app/migrations/041_admin_storage_system.sql

# Manually run migration
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/041_admin_storage_system.sql
```

### **Upload Fails**

**Check Permissions:**
```bash
# Ensure backend can write to storage
docker exec shop_backend ls -la /app/storage/
docker exec shop_backend mkdir -p /app/storage/images /app/storage/sounds /app/storage/documents /app/storage/general
docker exec shop_backend chmod -R 755 /app/storage/
```

**Check Logs:**
```bash
docker-compose logs backend | grep -i "upload\|storage\|multer"
```

### **Files Not Showing**

**Check API:**
```bash
# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" https://shop.cloudmc.online/api/admin/storage/files
```

**Check Database:**
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT COUNT(*) FROM storage_files;"
```

### **Quota Issues**

**Check User Quota:**
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT * FROM storage_quotas WHERE user_id = YOUR_USER_ID;"
```

**Increase Quota:**
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "UPDATE storage_quotas SET max_storage_bytes = 524288000, max_files = 5000 WHERE user_id = YOUR_USER_ID;"
```

---

## **Performance Optimization**

### **Enable Nginx Caching for Files**

Add to Nginx config:
```nginx
location /storage/ {
    alias /app/storage/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### **Add CDN (Optional)**

For production, consider uploading to CDN:
- Cloudflare R2
- AWS S3
- DigitalOcean Spaces

---

## **Monitoring**

### **Check Storage Usage**

```bash
# Total storage used
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT SUM(size_bytes) / 1024 / 1024 AS total_mb FROM storage_files;"

# Files by category
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT category, COUNT(*), SUM(size_bytes) / 1024 / 1024 AS total_mb FROM storage_files GROUP BY category;"
```

### **Check Analytics**

```bash
# Recent uploads
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT date, uploads_count, total_files, total_size_bytes / 1024 / 1024 AS total_mb FROM storage_analytics ORDER BY date DESC LIMIT 7;"
```

### **Check Access Logs**

```bash
# Recent file access
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT f.original_name, l.action, l.accessed_at FROM storage_access_log l JOIN storage_files f ON l.file_id = f.id ORDER BY l.accessed_at DESC LIMIT 20;"
```

---

## **Backup Strategy**

### **Backup Files**

```bash
# Backup storage directory
docker exec shop_backend tar -czf /tmp/storage-backup-$(date +%Y%m%d).tar.gz /app/storage/

# Copy to host
docker cp shop_backend:/tmp/storage-backup-$(date +%Y%m%d).tar.gz ./backups/
```

### **Backup Database**

```bash
# Backup storage tables
docker exec shop_postgres pg_dump -U shopuser -d shopdb -t storage_files -t storage_quotas -t storage_analytics -t storage_access_log > storage-db-backup-$(date +%Y%m%d).sql
```

---

## **Security Checklist**

- [x] Admin-only access enforced
- [x] JWT authentication required
- [x] File type validation
- [x] File size limits (10MB)
- [x] Quota enforcement
- [x] Access logging enabled
- [ ] HTTPS enabled (production)
- [ ] Rate limiting configured
- [ ] Regular backups scheduled

---

## **Post-Deployment Tasks**

1. **Test all features** with real files
2. **Monitor logs** for first 24 hours
3. **Check storage usage** daily for first week
4. **Set up automated backups**
5. **Configure alerts** for quota limits
6. **Document any issues** encountered

---

## **Success Criteria**

✅ Migration runs successfully  
✅ Storage directories created  
✅ Can upload files  
✅ Can view files in grid/list  
✅ Can search and filter  
✅ Can delete files  
✅ Stats display correctly  
✅ Sidebar link works  
✅ Dark mode works  
✅ Mobile responsive  

---

## **Rollback Plan**

If issues occur:

```bash
# Revert to previous commit
git revert HEAD
git push

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Remove storage tables (if needed)
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "DROP TABLE IF EXISTS storage_access_log, storage_analytics, storage_quotas, storage_files CASCADE;"
```

---

**Deployment Complete! 🎉**

The Storage System is now live and ready to use.
