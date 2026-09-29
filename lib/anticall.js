module.exports = function registerAntiCall(conn, config) {
  if (conn.__antiCallRegistered) return;

  conn.ev.on("call", async (calls) => {
    if (config.ANTI_CALL !== "true") return;

    for (const call of calls) {
      if (call.status !== "offer") continue;
      await conn.rejectCall(call.id, call.from);
    }
  });

  conn.__antiCallRegistered = true;
};
