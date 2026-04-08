import { Announcement } from './announcements.model.js';
import { Op } from 'sequelize';

class AnnouncementService {
  async createAnnouncement(data) {
    return await Announcement.create(data);
  }

  async getAnnouncements() {
    return await Announcement.findAll({ 
      order: [['published_at', 'DESC']] 
    });
  }

  async getLatestAnnouncement() {
    return await Announcement.findOne({
      where: { is_active: true },
      order: [['published_at', 'DESC']]
    });
  }

  async updateAnnouncement(id, data) {
    const announcement = await Announcement.findByPk(id);
    if (!announcement) throw new Error('Announcement not found');
    return await announcement.update(data);
  }

  async deleteAnnouncement(id) {
    const announcement = await Announcement.findByPk(id);
    if (!announcement) throw new Error('Announcement not found');
    return await announcement.destroy();
  }
}

export default new AnnouncementService();