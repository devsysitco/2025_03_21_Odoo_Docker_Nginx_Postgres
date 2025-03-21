# Use Ubuntu as base image
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set environment variables for better logging and performance
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random

# Create odoo user with specific UID/GID for better permission management
RUN groupadd -g 1000 odoo && \
    useradd -u 1000 -g odoo -d /opt/odoo -m -s /bin/bash odoo

# Install system dependencies and newer version of meson
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    python3-wheel \
    python3-setuptools \
    nodejs \
    npm \
    git \
    postgresql-client \
    libpq-dev \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    libevent-dev \
    libsasl2-dev \
    libldap2-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    fonts-liberation \
    gdebi-core \
    wget \
    ninja-build \
    libcairo2-dev \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m pip install --no-cache-dir meson>=0.64.0

# Set up directories with proper permissions
RUN mkdir -p /var/lib/odoo \
    && mkdir -p /var/log/odoo \
    && mkdir -p /mnt/extra-addons \
    && chown -R odoo:odoo /var/lib/odoo \
    && chown -R odoo:odoo /var/log/odoo \
    && chown -R odoo:odoo /mnt/extra-addons \
    && chmod -R 755 /var/log/odoo

# Copy requirements first for better cache utilization
COPY --chown=odoo:odoo ../requirements.txt /opt/odoo/odoo18_v1/
WORKDIR /opt/odoo/odoo18_v1

# Install Python dependencies
RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python3 -m pip install --no-cache-dir -r requirements.txt \
    && python3 -m pip install --no-cache-dir python-json-logger

# Copy application code
COPY --chown=odoo:odoo ../ /opt/odoo/odoo18_v1

# Set proper permissions for the Odoo directory
RUN chown -R odoo:odoo /opt/odoo \
    && chmod -R u+rw /opt/odoo

# Switch to odoo user
USER odoo

# Expose Odoo ports
EXPOSE 8069 8072

# Create directory for custom logging config
RUN mkdir -p /opt/odoo/odoo18_v1/logging

# Add a startup script
COPY --chown=odoo:odoo docker/scripts/docker-entrypoint.sh /opt/odoo/
RUN chmod +x /opt/odoo/docker-entrypoint.sh

ENTRYPOINT ["/opt/odoo/docker-entrypoint.sh"]
CMD ["./odoo-bin"]