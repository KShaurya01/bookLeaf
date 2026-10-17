import { z } from "zod";
import { loginWithEmailPassword } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await loginWithEmailPassword(body.email, body.password);
    if (!session) return jsonError("Invalid email or password", 401);
    return jsonOk({
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        authorId: session.authorId,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
