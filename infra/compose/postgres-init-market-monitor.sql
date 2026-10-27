\getenv market_monitor_password STOCKQUANT_DATABASE_PASSWORD_MARKET_MONITOR
SELECT format('CREATE ROLE market_monitor LOGIN PASSWORD %L', :'market_monitor_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'market_monitor')\gexec
ALTER ROLE market_monitor LOGIN PASSWORD :'market_monitor_password';
SELECT 'CREATE DATABASE market_monitor OWNER market_monitor'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'market_monitor')\gexec
