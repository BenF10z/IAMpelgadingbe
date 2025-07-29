module.exports = {
  apps: [
    {
      name: "app",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      cwd: "",
      env: {
        NODE_ENV: "production",
        HOST: "localhost",
        USER: "",
        PASSWORD: "",
        DB: "",
        SECRET: "",
        PORT: 2000,
      },
    },
  ],
  error_files: "/var/log/pm2/app.log",
  out_file: "/var/log/pm2/app.log",
  log_file: "/var/log/pm2/app.log",
};
