import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Mocking the data structure based on your Sequelize models
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,           // The UserAccount object
      person: null,         // The Person object
      roles: [],            // Array of Roles
      permissions: [],      // Array of Permission codes
      token: null,
      isAuthenticated: false,

      setAuth: (userData) => {
        // Assuming backend returns: { user, person, roles, permissions, token }
        set({
          user: userData.user,
          person: userData.person,
          roles: userData.roles,
          permissions: userData.permissions,
          token: userData.token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          person: null,
          roles: [],
          permissions: [],
          token: null,
          isAuthenticated: false,
        });
      },

      // Helper to check permissions
      hasPermission: (permissionCode) => {
        const { permissions } = get();
        return permissions.includes(permissionCode);
      },

      // Helper to check if the user is a specific role
      hasRole: (roleCode) => {
        const { roles } = get();
        return roles.some(r => r.role_code === roleCode);
      },
      
      // Helper to determine the profile type (Student, Instructor, Staff)
      getUserType: () => {
        const { user } = get();
        if (!user || !user.person) return 'GUEST';
        // Check associations logic based on what your backend returns
        if (user.person.student_profile) return 'STUDENT';
        if (user.person.instructor_profile) return 'INSTRUCTOR';
        if (user.person.staff) return 'STAFF';
        return 'ADMIN'; // Fallback
      }
    }),
    {
      name: 'gvc-auth-storage', // LocalStorage key
    }
  )
);