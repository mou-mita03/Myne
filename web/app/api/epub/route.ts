import { NextRequest, NextResponse } from "next/server";

const allowed = new Set([
  "www.gutenberg.org",
  "gutenberg.org",
]);

export async function GET(
  request: NextRequest
) {

  const raw =
    request.nextUrl.searchParams.get("url");


  if (!raw) {
    return NextResponse.json(
      {
        error: "Missing EPUB URL."
      },
      {
        status: 400
      }
    );
  }


  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid EPUB URL."
      },
      {
        status:400
      }
    );
  }


  const isEpub =
    url.pathname.endsWith(".epub") ||
    url.pathname.endsWith(".epub.images");


  if (
    url.protocol !== "https:" ||
    !allowed.has(
      url.hostname.toLowerCase()
    ) ||
    !isEpub
  ) {
    return NextResponse.json(
      {
        error:
          "This EPUB source is not allowed."
      },
      {
        status:400
      }
    );
  }


  try {

    const response =
      await fetch(url,{
        cache:"no-store"
      });


    if(!response.ok){

      return NextResponse.json(
        {
          error:
            "EPUB could not be downloaded."
        },
        {
          status:502
        }
      );
    }


    return new NextResponse(
      response.body,
      {
        headers:{
          "Content-Type":
            "application/epub+zip",

          "Content-Disposition":
            "inline; filename=book.epub",

          "X-Content-Type-Options":
            "nosniff",
        }
      }
    );


  } catch {

    return NextResponse.json(
      {
        error:
          "EPUB source could not be reached."
      },
      {
        status:502
      }
    );
  }
}