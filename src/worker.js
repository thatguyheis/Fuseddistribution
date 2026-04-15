async function sendLeadToWebhook(payload, env) {
  const response = await fetch(env.LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Webhook delivery failed.");
  }
}

async function sendLeadWithResend(payload, env) {
  const subject = `New Fused Distribution lead from ${payload.name}`;
  const lines = [
    `Name: ${payload.name}`,
    `Company: ${payload.company || "Not provided"}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    "",
    "Message:",
    payload.message
  ];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: env.LEAD_FROM_EMAIL,
      to: [env.LEAD_DESTINATION_EMAIL],
      subject,
      text: lines.join("\n")
    })
  });

  if (!response.ok) {
    throw new Error("Email delivery failed.");
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });
}

function validateLead(payload) {
  if (!payload || typeof payload !== "object") {
    return "Invalid request.";
  }

  if (!payload.name || !payload.email || !payload.message) {
    return "Name, email, and message are required.";
  }

  return null;
}

async function handleLead(request, env) {
  const payload = await request.json().catch(() => null);
  const validationError = validateLead(payload);

  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  const lead = {
    name: payload.name.trim(),
    company: (payload.company || "").trim(),
    email: payload.email.trim(),
    phone: (payload.phone || "").trim(),
    message: payload.message.trim(),
    source: "fuseddistribution.com",
    receivedAt: new Date().toISOString()
  };

  try {
    if (env.LEAD_WEBHOOK_URL) {
      await sendLeadToWebhook(lead, env);
    } else if (
      env.RESEND_API_KEY &&
      env.LEAD_DESTINATION_EMAIL &&
      env.LEAD_FROM_EMAIL
    ) {
      await sendLeadWithResend(lead, env);
    } else {
      return json(
        {
          error:
            "Lead capture is not configured yet. Add LEAD_WEBHOOK_URL or the Resend email variables in Cloudflare."
        },
        { status: 503 }
      );
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Lead submission failed", error);
    return json(
      { error: "We could not send your request right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
