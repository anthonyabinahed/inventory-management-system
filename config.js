const config = {
  appName: "Stock Management",
  appDescription:
    "Laboratry reageant system",
  domainName: "shipfa.st", // TODO: change
  resend: {
    fromNoReply: `Anamed <noreply@anamed.ch>`,
    fromAdmin: `Sally Sleiman at Anamed <s.sleiman@anamed.ch>`,
    supportEmail: "anthonyabinahed@gmail.com",
  },
  colors: {
    theme: "light",
    main: "#570df8",
  },
  auth: {
    loginUrl: "/signin",
    callbackUrl: "/dashboard",
  },
};

export default config;
