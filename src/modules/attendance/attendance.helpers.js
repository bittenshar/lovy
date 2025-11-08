const buildWorkerName = (worker, snapshot) => {
  if (snapshot) {
    return snapshot;
  }
  if (!worker) {
    return 'Unknown Worker';
  }
  if (worker.fullName) {
    return worker.fullName;
  }
  const parts = [worker.firstName, worker.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  if (worker.email) {
    return worker.email;
  }
  return 'Unknown Worker';
};

const formatLocationSnapshot = (input, fallbackLabel = null) => {
  if (!input) {
    return fallbackLabel || null;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed || fallbackLabel || null;
  }

  if (input.formattedAddress) {
    return input.formattedAddress;
  }

  const parts = [];
  if (input.line1) {
    parts.push(input.line1);
  }
  if (input.address && input.address !== input.line1) {
    parts.push(input.address);
  }
  const cityState = [input.city, input.state].filter(Boolean).join(', ');
  if (cityState) {
    parts.push(cityState);
  } else if (input.city) {
    parts.push(input.city);
  }
  if (input.postalCode) {
    parts.push(input.postalCode);
  }
  if (parts.length > 0) {
    return parts.join(', ');
  }
  if (input.name) {
    return input.name;
  }
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    return `${input.latitude}, ${input.longitude}`;
  }
  if (input.description) {
    return input.description;
  }
  return fallbackLabel || null;
};

const pickJobLocationSnapshot = (job) => {
  if (!job) return null;

  const jobLocation = job.location;
  const fromJob = formatLocationSnapshot(jobLocation, job.title ? `${job.title} Location` : null);
  if (fromJob) {
    return fromJob;
  }

  const business = job.business;
  if (business && typeof business === 'object' && business.location) {
    const fromBusiness = formatLocationSnapshot(
      business.location,
      business.name ? `${business.name} Location` : null
    );
    if (fromBusiness) {
      return fromBusiness;
    }
    if (business.name) {
      return business.name;
    }
  }

  return null;
};

const toPlainObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value.toObject === 'function') {
    return value.toObject();
  }
  return value;
};

const normalizeSimpleLocationInput = (input, fallback = {}) => {
  const source = toPlainObject(input);
  if (!source || typeof source !== 'object') {
    return null;
  }

  const latitude = Number(source.latitude);
  const longitude = Number(source.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const allowedRadiusSource =
    source.allowedRadius ??
    source.radius ??
    fallback.allowedRadius;
  const allowedRadius = Number(allowedRadiusSource);

  const formattedAddress =
    source.formattedAddress ||
    fallback.formattedAddress ||
    formatLocationSnapshot(source, fallback.fallbackLabel || null);

  if (!formattedAddress) {
    return null;
  }

  const normalized = {
    latitude,
    longitude,
    formattedAddress
  };

  if (Number.isFinite(allowedRadius)) {
    normalized.allowedRadius = allowedRadius;
  }

  return normalized;
};

module.exports = {
  buildWorkerName,
  formatLocationSnapshot,
  pickJobLocationSnapshot,
  normalizeSimpleLocationInput
};
