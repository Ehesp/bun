import { describe, test, expect } from "bun:test";
import { MIMEType, MIMEParams } from "util";

describe("MIME API", () => {
  const WHITESPACES = "\t\n\f\r ";
  const NOT_HTTP_TOKEN_CODE_POINT = ",";
  const NOT_HTTP_QUOTED_STRING_CODE_POINT = "\n";

  test("class instance integrity", () => {
    const mime = new MIMEType("application/ecmascript; ");
    const mime_descriptors = Object.getOwnPropertyDescriptors(mime);
    const mime_proto = Object.getPrototypeOf(mime);
    const mime_impersonator = { __proto__: mime_proto };

    for (const key of Object.keys(mime_descriptors)) {
      const descriptor = mime_descriptors[key];
      if (descriptor.get) {
        const getter = descriptor.get;
        expect(() => getter.call(mime_impersonator)).toThrow(/invalid receiver/i);
      }
      if (descriptor.set) {
        const setter = descriptor.set;
        expect(() => setter.call(mime_impersonator, "x")).toThrow(/invalid receiver/i);
      }
    }
  });

  test("basic properties and string conversion", () => {
    const mime = new MIMEType("application/ecmascript; ");

    expect(JSON.stringify(mime)).toBe(JSON.stringify("application/ecmascript"));
    expect(`${mime}`).toBe("application/ecmascript");
    expect(mime.essence).toBe("application/ecmascript");
    expect(mime.type).toBe("application");
    expect(mime.subtype).toBe("ecmascript");
    expect(mime.params).toBeDefined();
    expect([...mime.params]).toEqual([]);
    expect(mime.params.has("not found")).toBe(false);
    expect(mime.params.get("not found")).toBe(null);
    expect(mime.params.delete("not found")).toBe(undefined);
  });

  test("type property manipulation", () => {
    const mime = new MIMEType("application/ecmascript; ");

    mime.type = "text";
    expect(mime.type).toBe("text");
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/ecmascript"));
    expect(`${mime}`).toBe("text/ecmascript");
    expect(mime.essence).toBe("text/ecmascript");

    expect(() => {
      mime.type = `${WHITESPACES}text`;
    }).toThrow(/The MIME syntax for a type in/);

    expect(() => {
      mime.type = "";
    }).toThrow(/type/i);
    expect(() => {
      mime.type = "/";
    }).toThrow(/type/i);
    expect(() => {
      mime.type = "x/";
    }).toThrow(/type/i);
    expect(() => {
      mime.type = "/x";
    }).toThrow(/type/i);
    expect(() => {
      mime.type = NOT_HTTP_TOKEN_CODE_POINT;
    }).toThrow(/type/i);
    expect(() => {
      mime.type = `${NOT_HTTP_TOKEN_CODE_POINT}/`;
    }).toThrow(/type/i);
    expect(() => {
      mime.type = `/${NOT_HTTP_TOKEN_CODE_POINT}`;
    }).toThrow(/type/i);
  });

  test("subtype property manipulation", () => {
    const mime = new MIMEType("application/ecmascript; ");
    mime.type = "text";

    mime.subtype = "javascript";
    expect(mime.type).toBe("text");
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/javascript"));
    expect(`${mime}`).toBe("text/javascript");
    expect(mime.essence).toBe("text/javascript");
    expect(`${mime.params}`).toBe("");
    expect(`${new MIMEParams()}`).toBe("");
    expect(`${new MIMEParams(mime.params)}`).toBe("");
    expect(`${new MIMEParams(`${mime.params}`)}`).toBe("");

    expect(() => {
      mime.subtype = `javascript${WHITESPACES}`;
    }).toThrow(/The MIME syntax for a subtype in/);

    expect(() => {
      mime.subtype = "";
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = ";";
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = "x;";
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = ";x";
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = NOT_HTTP_TOKEN_CODE_POINT;
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = `${NOT_HTTP_TOKEN_CODE_POINT};`;
    }).toThrow(/subtype/i);
    expect(() => {
      mime.subtype = `;${NOT_HTTP_TOKEN_CODE_POINT}`;
    }).toThrow(/subtype/i);
  });

  test("parameters manipulation", () => {
    const mime = new MIMEType("application/ecmascript; ");
    mime.type = "text";
    mime.subtype = "javascript";

    const params = mime.params;

    // Setting parameters
    params.set("charset", "utf-8");
    expect(params.has("charset")).toBe(true);
    expect(params.get("charset")).toBe("utf-8");
    expect([...params]).toEqual([["charset", "utf-8"]]);
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/javascript;charset=utf-8"));
    expect(`${mime}`).toBe("text/javascript;charset=utf-8");
    expect(mime.essence).toBe("text/javascript");
    expect(`${mime.params}`).toBe("charset=utf-8");
    expect(`${new MIMEParams(mime.params)}`).toBe("");
    expect(`${new MIMEParams(`${mime.params}`)}`).toBe("");

    // Multiple parameters
    params.set("goal", "module");
    expect(params.has("goal")).toBe(true);
    expect(params.get("goal")).toBe("module");
    expect([...params]).toEqual([
      ["charset", "utf-8"],
      ["goal", "module"],
    ]);
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/javascript;charset=utf-8;goal=module"));
    expect(`${mime}`).toBe("text/javascript;charset=utf-8;goal=module");
    expect(mime.essence).toBe("text/javascript");
    expect(`${mime.params}`).toBe("charset=utf-8;goal=module");

    // Invalid parameter name
    expect(() => {
      params.set(`${WHITESPACES}goal`, "module");
    }).toThrow(/The MIME syntax for a parameter name in/);

    // Updating a parameter
    params.set("charset", "iso-8859-1");
    expect(params.has("charset")).toBe(true);
    expect(params.get("charset")).toBe("iso-8859-1");
    expect([...params]).toEqual([
      ["charset", "iso-8859-1"],
      ["goal", "module"],
    ]);
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/javascript;charset=iso-8859-1;goal=module"));
    expect(`${mime}`).toBe("text/javascript;charset=iso-8859-1;goal=module");
    expect(mime.essence).toBe("text/javascript");

    // Deleting a parameter
    params.delete("charset");
    expect(params.has("charset")).toBe(false);
    expect(params.get("charset")).toBe(null);
    expect([...params]).toEqual([["goal", "module"]]);
    expect(JSON.stringify(mime)).toBe(JSON.stringify("text/javascript;goal=module"));
    expect(`${mime}`).toBe("text/javascript;goal=module");
    expect(mime.essence).toBe("text/javascript");

    // Empty parameter value
    params.set("x", "");
    expect(params.has("x")).toBe(true);
    expect(params.get("x")).toBe("");
    expect([...params]).toEqual([
      ["goal", "module"],
      ["x", ""],
    ]);
    expect(JSON.stringify(mime)).toBe(JSON.stringify('text/javascript;goal=module;x=""'));
    expect(`${mime}`).toBe('text/javascript;goal=module;x=""');
    expect(mime.essence).toBe("text/javascript");
  });

  test("invalid parameter names", () => {
    const mime = new MIMEType("text/javascript");
    const params = mime.params;

    expect(() => params.set("", "x")).toThrow(/parameter name/i);
    expect(() => params.set("=", "x")).toThrow(/parameter name/i);
    expect(() => params.set("x=", "x")).toThrow(/parameter name/i);
    expect(() => params.set("=x", "x")).toThrow(/parameter name/i);
    expect(() => params.set(`${NOT_HTTP_TOKEN_CODE_POINT}=`, "x")).toThrow(/parameter name/i);
    expect(() => params.set(`${NOT_HTTP_TOKEN_CODE_POINT}x`, "x")).toThrow(/parameter name/i);
    expect(() => params.set(`x${NOT_HTTP_TOKEN_CODE_POINT}`, "x")).toThrow(/parameter name/i);
  });

  test("invalid parameter values", () => {
    const mime = new MIMEType("text/javascript");
    const params = mime.params;

    expect(() => params.set("x", `${NOT_HTTP_QUOTED_STRING_CODE_POINT};`)).toThrow(/parameter value/i);
    expect(() => params.set("x", `${NOT_HTTP_QUOTED_STRING_CODE_POINT}x`)).toThrow(/parameter value/i);
    expect(() => params.set("x", `x${NOT_HTTP_QUOTED_STRING_CODE_POINT}`)).toThrow(/parameter value/i);
  });
});
