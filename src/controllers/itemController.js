const Item = require('../models/item.model');
const HealthQueue = require('../models/healthQueue.model');
const { checkLinkHealth } = require('../utils/linkHealth');

// Basic URL detection for raw input.
function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

// Keep version history internal for Phase 1 API responses.
function hideVersionHistory(item) {
  const output = item.toObject ? item.toObject() : item;
  if (output.versioning) {
    delete output.versioning.previous_versions;
  }
  return output;
}

async function createItem(req, res) {
  const { raw, external_id } = req.body;

  if (!raw) {
    return res.status(400).json({ error: 'raw is required' });
  }

  const urlFromRaw = isUrl(raw) ? raw.trim() : undefined;

  const filters = [];
  if (urlFromRaw) filters.push({ 'source.url': urlFromRaw });
  if (external_id) filters.push({ 'source.external_id': external_id });

  try {
    // Return existing item instead of creating duplicates.
    if (filters.length > 0) {
      const existing = await Item.findOne({ $or: filters });
      if (existing) {
        return res.status(200).json({ status: 'exists', item: hideVersionHistory(existing) });
      }
    }

    const hash = Item.contentHash(raw);
    const linkStatus = urlFromRaw ? await checkLinkHealth(urlFromRaw) : 'active';

    const item = await Item.create({
      content: {
        raw,
        type: urlFromRaw ? 'link' : 'text'
      },
      source: {
        type: 'manual',
        url: urlFromRaw,
        external_id
      },
      origin: {
        created_at: new Date(),
        created_by: 'user'
      },
      sync: {
        link_status: linkStatus,
        has_changed: false,
        last_synced_at: new Date()
      },
      versioning: {
        current_hash: hash,
        previous_versions: []
      }
    });

    if (item.sync.link_status === 'broken') {
      await HealthQueue.create({ item_id: item._id, issue_type: 'broken_link' });
    }

    return res.status(201).json({ status: 'saved', item: hideVersionHistory(item) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'duplicate source url or external_id' });
    }
    return res.status(500).json({ error: 'failed to create item' });
  }
}

async function syncItem(req, res) {
  const { raw, url, external_id, platform } = req.body;

  if (!raw) {
    return res.status(400).json({ error: 'raw is required' });
  }

  const rawIsUrl = isUrl(raw);
  const effectiveUrl = url || (rawIsUrl ? raw.trim() : undefined);

  if (!effectiveUrl && !external_id) {
    return res.status(400).json({ error: 'url or external_id is required' });
  }

  const filters = [];
  if (external_id) filters.push({ 'source.external_id': external_id });
  if (effectiveUrl) filters.push({ 'source.url': effectiveUrl });

  try {
    const existing = await Item.findOne({ $or: filters });
    const nextHash = Item.contentHash(raw);
    const linkStatus = effectiveUrl ? await checkLinkHealth(effectiveUrl) : 'unknown';

    if (!existing) {
      const created = await Item.create({
        content: {
          raw,
          type: rawIsUrl ? 'link' : 'text'
        },
        source: {
          type: 'api',
          platform,
          url: effectiveUrl,
          external_id
        },
        origin: {
          created_at: new Date(),
          created_by: 'system'
        },
        sync: {
          last_synced_at: new Date(),
          has_changed: false,
          link_status: linkStatus
        },
        versioning: {
          current_hash: nextHash,
          previous_versions: []
        }
      });

      if (created.sync.link_status === 'broken') {
        await HealthQueue.create({ item_id: created._id, issue_type: 'broken_link' });
      }

      return res.status(201).json(hideVersionHistory(created));
    }

    const previousLinkStatus = existing.sync.link_status;
    const hasChanged = existing.versioning.current_hash !== nextHash;

    if (hasChanged) {
      existing.versioning.previous_versions.push({
        content: {
          raw: existing.content.raw,
          type: existing.content.type
        },
        timestamp: new Date()
      });

      existing.content.raw = raw;
      existing.content.type = rawIsUrl ? 'link' : 'text';
      existing.versioning.current_hash = nextHash;
      existing.sync.has_changed = true;
    } else {
      existing.sync.has_changed = false;
    }

    existing.source.type = 'api';
    existing.source.url = effectiveUrl || existing.source.url;
    existing.source.external_id = external_id || existing.source.external_id;
    existing.source.platform = platform || existing.source.platform;
    existing.sync.last_synced_at = new Date();
    existing.sync.link_status = linkStatus;

    await existing.save();

    if (previousLinkStatus !== 'broken' && existing.sync.link_status === 'broken') {
      await HealthQueue.create({ item_id: existing._id, issue_type: 'broken_link' });
    }

    return res.status(200).json(hideVersionHistory(existing));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'duplicate source url or external_id' });
    }
    return res.status(500).json({ error: 'failed to sync item' });
  }
}

async function listItems(req, res) {
  try {
    const items = await Item.find()
      .select('-versioning.previous_versions')
      .sort({ 'origin.created_at': -1 })
      .limit(50);

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch items' });
  }
}

async function listHealthQueue(req, res) {
  try {
    const issues = await HealthQueue.find({ status: 'pending' })
      .sort({ detected_at: -1 })
      .select('item_id issue_type status priority detected_at');

    return res.status(200).json(issues);
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch health queue' });
  }
}

module.exports = { createItem, syncItem, listItems, listHealthQueue };
