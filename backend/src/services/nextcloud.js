const axios = require('axios');
const FormData = require('form-data');

class NextcloudService {
  constructor() {
    this.baseUrl = process.env.NEXTCLOUD_URL || 'http://localhost:5051';
    this.username = process.env.NEXTCLOUD_USERNAME;
    this.password = process.env.NEXTCLOUD_PASSWORD;
    this.uploadPath = process.env.NEXTCLOUD_UPLOAD_PATH || '/shopimages';
  }

  getAuth() {
    return {
      username: this.username,
      password: this.password
    };
  }

  async uploadImage(buffer, filename, folder = '') {
    try {
      const path = `${this.uploadPath}${folder ? '/' + folder : ''}/${filename}`;
      const url = `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`;

      await axios.put(url, buffer, {
        auth: this.getAuth(),
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      // Return public share link or direct link
      const publicUrl = await this.createShareLink(path);
      return publicUrl || `${this.baseUrl}${path}`;
    } catch (error) {
      console.error('Nextcloud upload error:', error.message);
      throw new Error('Failed to upload image to Nextcloud');
    }
  }

  async createShareLink(path) {
    try {
      const url = `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
      
      const formData = new FormData();
      formData.append('path', path);
      formData.append('shareType', '3'); // Public link
      formData.append('permissions', '1'); // Read only

      const response = await axios.post(url, formData, {
        auth: this.getAuth(),
        headers: {
          ...formData.getHeaders(),
          'OCS-APIRequest': 'true'
        }
      });

      if (response.data?.ocs?.data?.url) {
        return response.data.ocs.data.url;
      }

      return null;
    } catch (error) {
      console.error('Create share link error:', error.message);
      return null;
    }
  }

  async deleteImage(path) {
    try {
      const url = `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`;
      
      await axios.delete(url, {
        auth: this.getAuth()
      });

      return true;
    } catch (error) {
      console.error('Nextcloud delete error:', error.message);
      return false;
    }
  }

  async createFolder(folderPath) {
    try {
      const path = `${this.uploadPath}/${folderPath}`;
      const url = `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`;

      await axios({
        method: 'MKCOL',
        url: url,
        auth: this.getAuth()
      });

      return true;
    } catch (error) {
      // Folder might already exist
      if (error.response?.status === 405) {
        return true;
      }
      console.error('Create folder error:', error.message);
      return false;
    }
  }
}

module.exports = new NextcloudService();
