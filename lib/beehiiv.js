// ============================================================
// lib/beehiiv.js — Beehiiv REST API wrapper
// Creates draft posts. Never sends. Yuri reviews + sends manually.
// API docs: https://developers.beehiiv.com/api-reference/posts/create
// ============================================================

import axios from 'axios';
import { CONFIG } from '../config.js';

const BASE = 'https://api.beehiiv.com/v2';

function http() {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${CONFIG.beehiivKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * Create a draft post in the Signal publication.
 * The post sits in Beehiiv as a draft; Yuri reviews + sends manually.
 *
 * @param {object} payload
 * @param {string} payload.title — subject line / post title
 * @param {string} payload.subtitle — preheader text
 * @param {string} payload.bodyHtml — full HTML body
 * @param {string} [payload.thumbnailUrl] — optional cover image URL
 * @param {string[]} [payload.contentTags] — Beehiiv content tags
 * @returns {object} Beehiiv API response (includes post id + dashboard URL)
 */
export async function createDraft(payload) {
  if (!CONFIG.draftOnly) {
    throw new Error('DRAFT_ONLY is false. Refusing to send without manual review.');
  }

  const body = {
    title: payload.title,
    subtitle: payload.subtitle,
    body_content: payload.bodyHtml,
    status: 'draft',
    content_tags: payload.contentTags || ['daily-signal'],
  };
  if (payload.thumbnailUrl) body.thumbnail_url = payload.thumbnailUrl;

  try {
    const res = await http().post(
      `/publications/${CONFIG.beehiivPublicationId}/posts`,
      body
    );
    return {
      ok: true,
      postId: res.data?.data?.id,
      dashboardUrl: dashboardUrl(res.data?.data?.id),
      raw: res.data,
    };
  } catch (e) {
    const detail = e.response?.data || e.message;
    throw new Error(
      `Beehiiv createDraft failed (status ${e.response?.status}): ${JSON.stringify(detail).slice(0, 600)}`
    );
  }
}

/** Build the dashboard URL for a draft post. */
function dashboardUrl(postId) {
  if (!postId) return null;
  return `https://app.beehiiv.com/posts/${postId}/edit`;
}

/** Smoke test: hit the publication endpoint to verify credentials. */
export async function testConnection() {
  try {
    const res = await http().get(`/publications/${CONFIG.beehiivPublicationId}`);
    return {
      ok: true,
      publicationName: res.data?.data?.name,
      publicationId: res.data?.data?.id,
    };
  } catch (e) {
    return {
      ok: false,
      error: e.response?.status,
      message: JSON.stringify(e.response?.data || e.message).slice(0, 500),
    };
  }
}
