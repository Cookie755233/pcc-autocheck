import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

//@ Set very strict rate limits to avoid 429 errors from the PCC API
// 10 requests per minute per IP
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 50, // Max 50 unique users per interval
  limit: 10, // 10 requests per interval per token
});

//@ Proxy API requests to reduce the chance of rate limiting
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    //? Apply rate limiting based on IP address
    await limiter.check(10, ip); // 10 requests per minute per IP

    //! Add delay to spread out requests
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));

    //@ Forward the request to the target API
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 PCC-Autocheck/1.0",
        Accept: "application/json",
      },
      cache: "no-cache",
    });

    if (!response.ok) {
      //! If the underlying API returns an error, pass it through
      return NextResponse.json(
        { error: `API returned ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    //@ Return the API response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if ((error as any).status === 429) {
      //? If rate limit exceeded, return 429 with retry-after header
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    //! Any other error
    console.error("Proxy API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
