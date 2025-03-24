#!/bin/bash
set -e

# Create logging directory if it doesn't exist
mkdir -p /opt/odoo/odoo18_v1/logging
mkdir -p /var/log/odoo
touch /var/log/odoo/odoo.log
chown -R odoo:odoo /var/log/odoo

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    local retries=30
    while ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; do
        retries=$((retries - 1))
        if [ $retries -eq 0 ]; then
            echo "Failed to connect to PostgreSQL after 30 attempts. Exiting."
            exit 1
        fi
        echo "Waiting for PostgreSQL to be ready... ($retries attempts left)"
        sleep 2
    done
    echo "PostgreSQL is ready!"
}

wait_for_postgres

# Start Odoo with explicit database configuration
exec "$@"