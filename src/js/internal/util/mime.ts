const ObjectDefineProperty = Object.defineProperty;
const RegExpPrototypeExec = RegExp.prototype.exec;
const SafeStringPrototypeSearch = (str, regexp) => {
  regexp.lastIndex = 0;
  const match = RegExpPrototypeExec.$call(regexp, str);
  return match ? match.index : -1;
};
const StringPrototypeIndexOf = String.prototype.indexOf;
const StringPrototypeSlice = String.prototype.slice;
const StringPrototypeToLowerCase = String.prototype.toLowerCase;

const NOT_HTTP_TOKEN_CODE_POINT = /[^!#$%&'*+\-.^_`|~A-Za-z0-9]/g;

const END_BEGINNING_WHITESPACE = /[^\r\n\t ]|$/;
const START_ENDING_WHITESPACE = /[\r\n\t ]*$/;

function toASCIILower(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    result += char >= "A" && char <= "Z" ? StringPrototypeToLowerCase.$call(char) : char;
  }
  return result;
}

const SOLIDUS = "/";
const SEMICOLON = ";";

function parseTypeAndSubtype(str) {
  // Skip only HTTP whitespace from start
  let position = SafeStringPrototypeSearch(str, END_BEGINNING_WHITESPACE);
  // read until '/'
  const typeEnd = StringPrototypeIndexOf.$call(str, SOLIDUS, position);
  const trimmedType =
    typeEnd === -1 ? StringPrototypeSlice.$call(str, position) : StringPrototypeSlice.$call(str, position, typeEnd);
  const invalidTypeIndex = SafeStringPrototypeSearch(trimmedType, NOT_HTTP_TOKEN_CODE_POINT);
  if (trimmedType === "" || invalidTypeIndex !== -1 || typeEnd === -1) {
    throw $ERR_INVALID_MIME_SYNTAX("type", str, invalidTypeIndex);
  }
  // skip type and '/'
  position = typeEnd + 1;
  const type = toASCIILower(trimmedType);
  // read until ';'
  const subtypeEnd = StringPrototypeIndexOf.$call(str, SEMICOLON, position);
  const rawSubtype =
    subtypeEnd === -1
      ? StringPrototypeSlice.$call(str, position)
      : StringPrototypeSlice.$call(str, position, subtypeEnd);
  position += rawSubtype.length;
  if (subtypeEnd !== -1) {
    // skip ';'
    position += 1;
  }
  const trimmedSubtype = StringPrototypeSlice.$call(
    rawSubtype,
    0,
    SafeStringPrototypeSearch(rawSubtype, START_ENDING_WHITESPACE),
  );
  const invalidSubtypeIndex = SafeStringPrototypeSearch(trimmedSubtype, NOT_HTTP_TOKEN_CODE_POINT);
  if (trimmedSubtype === "" || invalidSubtypeIndex !== -1) {
    throw $ERR_INVALID_MIME_SYNTAX("subtype", str, invalidSubtypeIndex);
  }
  const subtype = toASCIILower(trimmedSubtype);
  return [type, subtype, position];
}

const EQUALS_SEMICOLON_OR_END = /[;=]|$/;
const QUOTED_VALUE_PATTERN = /^(?:([\\]$)|[\\][\s\S]|[^"])*(?:(")|$)/u;

function removeBackslashes(str) {
  let ret = "";
  // We stop at str.length - 1 because we want to look ahead one character.
  let i;
  for (i = 0; i < str.length - 1; i++) {
    const c = str[i];
    if (c === "\\") {
      i++;
      ret += str[i];
    } else {
      ret += c;
    }
  }
  // We add the last character if we didn't skip to it.
  if (i === str.length - 1) {
    ret += str[i];
  }
  return ret;
}

function escapeQuoteOrSolidus(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += char === '"' || char === "\\" ? `\\${char}` : char;
  }
  return result;
}

const encode = value => {
  if (value.length === 0) return '""';
  const encode = SafeStringPrototypeSearch(value, NOT_HTTP_TOKEN_CODE_POINT) !== -1;
  if (!encode) return value;
  const escaped = escapeQuoteOrSolidus(value);
  return `"${escaped}"`;
};

const { MIMEParams } = $cpp("JSMIMEParams.cpp", "createJSMIMEParamsBinding");
const instantiateMimeParams = $newCppFunction("JSMIMEParams.cpp", "instantiateMimeParams", 1);

class MIMEType {
  #type;
  #subtype;
  #parameters;
  constructor(string) {
    string = `${string}`;
    const data = parseTypeAndSubtype(string);
    this.#type = data[0];
    this.#subtype = data[1];
    this.#parameters = instantiateMimeParams(StringPrototypeSlice.$call(string, data[2]));
  }

  get type() {
    return this.#type;
  }

  set type(v) {
    v = `${v}`;
    const invalidTypeIndex = SafeStringPrototypeSearch(v, NOT_HTTP_TOKEN_CODE_POINT);
    if (v.length === 0 || invalidTypeIndex !== -1) {
      throw $ERR_INVALID_MIME_SYNTAX("type", v, invalidTypeIndex);
    }
    this.#type = toASCIILower(v);
  }

  get subtype() {
    return this.#subtype;
  }

  set subtype(v) {
    v = `${v}`;
    const invalidSubtypeIndex = SafeStringPrototypeSearch(v, NOT_HTTP_TOKEN_CODE_POINT);
    if (v.length === 0 || invalidSubtypeIndex !== -1) {
      throw $ERR_INVALID_MIME_SYNTAX("subtype", v, invalidSubtypeIndex);
    }
    this.#subtype = toASCIILower(v);
  }

  get essence() {
    return `${this.#type}/${this.#subtype}`;
  }

  get params() {
    return this.#parameters;
  }

  toString() {
    let ret = `${this.#type}/${this.#subtype}`;
    const paramStr = this.#parameters.toString();
    if (paramStr.length) ret += `;${paramStr}`;
    return ret;
  }
}
ObjectDefineProperty(MIMEType.prototype, "toJSON", {
  __proto__: null,
  configurable: true,
  value: MIMEType.prototype.toString,
  writable: true,
});

export default {
  MIMEParams,
  MIMEType,
};
