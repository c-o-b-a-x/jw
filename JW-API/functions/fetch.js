export async function onRequestGet() {
    try {
        const response = await fetch("https://juicewrldapi.com/juicewrld/stats/");

        if (!response.ok) {
            return new Response("API request failed", {
                status: response.status
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
}