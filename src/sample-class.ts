import { ParsedCommand, CommandParser } from "./command-parser.js"
/**

Definition

adduser str --email str? --password str --permission str[]

 */


type TypeFn = (s: string) => boolean
type TypeFnNullish = (s: string|null) => boolean
type CmdTypeFn = (c: ParsedCommand) => boolean

function str(s: string|null) { return s !== undefined && s !== null; }
function ostr(s: string|null) { return true; }
function flag(s: string|null) { return true; }
function num(s: string|null) { return s !== undefined && s !== null && /^[0-9]+$/.test(s); }
function onum(s: string|null) { return s === undefined || (s !== null && /^[0-9]+$/.test(s)); }

const TYPEFN: Record<string, TypeFn> = {
        "str": (s: string|null) => { return s !== undefined && s !== null; },
        "flag": (s: string|null) => { return s === null },
        "num": (s: string|null) => { return s !== undefined && s !== null && /^[0-9]+$/.test(s); },
        "num?": (s: string|null) => { return s === undefined || (s !== null && /^[0-9]+$/.test(s)); },
}

function fromMultipleEntries(entries_list: [string, string|null][]): Record<string, (string|null)[]> {
        const coll = {} as Record<string, (string|null)[]>;
        for (const [k, v] of entries_list) {
                if (coll[k]) { coll[k]!.push(v); }
                else { coll[k] = [v]; }
        }
        return coll;
}

type CmdDef<CmdName extends string> = {
        command: CmdName,
        argsdef: TypeFn[],
        argrest: TypeFn | undefined,
        optsdef: { n: string, rep: boolean, t: TypeFnNullish, o: boolean}[],
        substype: "list" | "map" | "none",
        subsdef: Record<string, { cmddef: CmdDef<string>, optional: boolean }>
}

const adduser_$def: CmdDef<"adduser"> = {
        command: "adduser",
        argsdef: [ 
                str, 
        ],
        argrest: undefined,
        optsdef: [
                { n: "--email", rep: false, t: str, o: true },
                { n: "--password", rep: false, t: str, o: false },
                { n: "--permission", rep: true, t: str, o: true },
        ],
        substype: "none",
        subsdef: {},
}

type adduser = {
        command: "adduser",
        args: [ 
                string,
        ]
        options: {
                ["--email"]: string|undefined
                ["--password"]: string
                ["--permission"]: string[]
        }
        subs: never[],
}

function $check_all(p: ParsedCommand, def: CmdDef<string>): boolean {
        if (!$check_args(p, def.argsdef, def.argrest)) { return false; }
        const optionsm = fromMultipleEntries(p.options);
        for (const optdef of def.optsdef) {
                if (!$check_option(optionsm, optdef.n, optdef.rep, optdef.o, optdef.t)) { return false; }
        }
        if (def.substype === "list") {
                if (!$check_subs_list(def.subsdef, p.subs)) { return false; }
        } else if (def.substype === "map") {
                if (!$check_subs_dict(def.subsdef, p.subs)) { return false; }
        }
        return true;
}

function $check_args(p: ParsedCommand, argsdef: TypeFn[], restargs: TypeFn|undefined): boolean {
        if (p.args.length < argsdef.length) { return false; }
        for (let i=0; i<p.args.length; i++) {
                if (!argsdef[i]!(p.args[i]!)) { return false; }
        }
        if (restargs && p.args.length > argsdef.length) {
                for (const in_arg of p.args.slice(argsdef.length)) {
                        if (!restargs(in_arg)) { return false; }
                }
        }
        return true;
}

function $check_option(optionsm: Record<string, (string|null)[]>, key: string, is_repeatable: boolean, is_optional: boolean, type: (s: string|null) => boolean): boolean {
        const optiona = optionsm[key];
        const optiona_len = optionsm[key]?.length ?? 0;
        if (optiona_len === 0 && !is_repeatable && !is_optional) { return false; }
        if (optiona_len > 1 && !is_repeatable) { return false; }
        for (const option of optiona ?? []) {
                if (!type(option)) { return false; }
        }
        return true;
}

function $check_subs_list(subsdef: Record<string, { cmddef: CmdDef<string>, optional: boolean }>, subs: ParsedCommand[]): boolean {
        for (const sub of subs) {
                const command = sub.command;
                const def = subsdef[command];
                if (!def) { return false; }
                const subpass = $check_all(sub, def.cmddef);
                if (!subpass) { return false; }
        }
        return true;
}

function $check_subs_dict(subsdef: Record<string, { cmddef: CmdDef<string>, optional: boolean }>, subs: ParsedCommand[]): boolean {
        const seen = new Set<string>();
        const still_need = new Set<string>(Object.entries(subsdef).filter(([_k, v]) => v.optional === false).map(([k, _v]) => k));
        for (const sub of subs) {
                const command = sub.command;
                if (seen.has(command)) { return false; }
                const def = subsdef[command];
                if (!def) { return false; }
                const subpass = $check_all(sub, def.cmddef);
                if (!subpass) { return false; }
                seen.add(command);
                still_need.delete(command);
        }
        if (still_need.size > 0) { return false; }
        return true;
}