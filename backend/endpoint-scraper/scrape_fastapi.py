import requests
import json

OPENAPI_URL = "http://localhost:8000/openapi.json"
OUTPUT_FILE = "endpoint-scraper/fastapi_endpoints.txt"

def main():
    # Fetch OpenAPI spec
    resp = requests.get(OPENAPI_URL)
    resp.raise_for_status()
    spec = resp.json()

    paths = spec.get("paths", {})
    total_endpoints = 0
    output_lines = []

    for path, methods in paths.items():
        for method, details in methods.items():
            total_endpoints += 1
            tag_str = ", ".join(details.get("tags", [])) or "No category"
            summary = details.get("summary", "No summary")
            description = details.get("description", "No description")

            output_lines.append(f"{'='*60}")
            output_lines.append(f"ENDPOINT {total_endpoints}")
            output_lines.append(f"Method: {method.upper()}")
            output_lines.append(f"Path: {path}")
            output_lines.append(f"Category/Tags: {tag_str}")
            output_lines.append(f"Summary: {summary}")
            output_lines.append(f"Description: {description}")

            # Parameters
            if details.get("parameters"):
                output_lines.append("Parameters:")
                for param in details["parameters"]:
                    output_lines.append(f"  - Name: {param.get('name')}")
                    output_lines.append(f"    In: {param.get('in')}")
                    output_lines.append(f"    Required: {param.get('required')}")
                    output_lines.append(f"    Type: {param.get('schema', {}).get('type')}")
                    output_lines.append(f"    Description: {param.get('description', 'No description')}")

            # Request body
            if "requestBody" in details:
                content = details["requestBody"].get("content", {})
                output_lines.append("Request Body:")
                for mime_type, body_info in content.items():
                    output_lines.append(f"  MIME Type: {mime_type}")
                    schema = body_info.get("schema", {})
                    output_lines.append(f"  Schema: {json.dumps(schema, indent=4)}")

            # Responses
            if "responses" in details:
                output_lines.append("Responses:")
                for code, resp_info in details["responses"].items():
                    output_lines.append(f"  HTTP {code}: {resp_info.get('description', '')}")
                    if "content" in resp_info:
                        for mime_type, body_info in resp_info["content"].items():
                            output_lines.append(f"    MIME Type: {mime_type}")
                            schema = body_info.get("schema", {})
                            output_lines.append(f"    Schema: {json.dumps(schema, indent=4)}")

            output_lines.append("")

    # Summary
    output_lines.insert(0, f"Total API Endpoints: {total_endpoints}\n")

    # Write to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))

    print(f"[✅] Extracted {total_endpoints} endpoints to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
