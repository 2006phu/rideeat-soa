-- =============================================================================
-- RideEat SOA - PostgreSQL Multi-Schema / Multi-Database Initialization
-- Implements Database-per-Service logical isolation via dedicated schemas
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS user_schema;
CREATE SCHEMA IF NOT EXISTS ride_schema;
CREATE SCHEMA IF NOT EXISTS food_schema;
CREATE SCHEMA IF NOT EXISTS map_schema;
CREATE SCHEMA IF NOT EXISTS payment_schema;
CREATE SCHEMA IF NOT EXISTS rating_schema;
CREATE SCHEMA IF NOT EXISTS promo_schema;
CREATE SCHEMA IF NOT EXISTS notification_schema;

-- Grant privileges to default application role
GRANT ALL PRIVILEGES ON SCHEMA auth_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA user_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA ride_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA food_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA map_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA payment_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA rating_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA promo_schema TO rideeat;
GRANT ALL PRIVILEGES ON SCHEMA notification_schema TO rideeat;
