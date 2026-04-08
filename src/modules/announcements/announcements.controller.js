import AnnouncementService from './announcements.service.js';

export const createAnnouncement = async (req, res, next) => {
  try {
    const data = await AnnouncementService.createAnnouncement(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

export const getAnnouncements = async (req, res, next) => {
  try {
    const data = await AnnouncementService.getAnnouncements();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getLatestAnnouncement = async (req, res, next) => {
  try {
    const data = await AnnouncementService.getLatestAnnouncement();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const data = await AnnouncementService.updateAnnouncement(req.params.id, req.body);
    res.json({ success: true, message: 'Announcement updated successfully', data });
  } catch (error) { next(error); }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await AnnouncementService.deleteAnnouncement(req.params.id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) { next(error); }
};