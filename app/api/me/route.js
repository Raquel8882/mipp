import { getUserAndRolesFromRequest } from '../../../lib/authHelpers';

export async function GET(req) {
  const info = await getUserAndRolesFromRequest(req);
  if (!info) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
  return new Response(JSON.stringify({ user: info.user, roles: info.roles }), { status: 200 });
}
