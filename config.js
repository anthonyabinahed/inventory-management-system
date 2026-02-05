const config = {
  appName: "Anamed Stock Management",
  appDescription: "Laboratry reageant system",
  domainName: "shipfa.st", // TODO: change
  resend: {
    fromNoReply: `Anamed <noreply@testing-anthony.xyz>`, // TODO: change
    fromAdmin: `Sally Sleiman at Anamed <admin@testing-anthony.xyz>`, // TODO: change
    supportEmail: "anthonyabinahed@gmail.com",
  },
  colors: {
    theme: "light",
    main: "#60baa9",
  },
  routes: {
    home: "/",
    login: "/login",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    acceptInvite: "/accept-invite",
    // Prefixes for pattern matching in middleware
    adminPrefix: "/admin",
    apiPrefix: "/api",
    admin: {
      dashboard: {
        users: "/admin/dashboard/users",
      },
    },
    api: {
      auth: {
        callback: "/api/auth/callback",
      }
    },
  },
};

export default config;
