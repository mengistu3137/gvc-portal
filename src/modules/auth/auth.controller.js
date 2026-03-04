import AuthService from './auth.service.js';

export const login = async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const getUsers = async (req, res, next) => {
  try {
    const data = await AuthService.getAllUsers(req.query);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await AuthService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const deleteUser = async (req, res, next) => {
  try {
    await AuthService.deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted (archived)" });
  } catch (error) { next(error); }
};