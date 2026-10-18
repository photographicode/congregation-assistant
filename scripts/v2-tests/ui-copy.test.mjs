import test from 'node:test';import assert from 'node:assert/strict';import {Linter} from 'eslint';import parser from '@typescript-eslint/parser';import rule from '../no-raw-jsx-text.mjs';
const lint=source=>new Linter().verify(source,[{files:['**/*.tsx'],languageOptions:{parser,parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{copy:{rules:{localized:rule}}},rules:{'copy/localized':'error'}}],{filename:'form.tsx'});
test('requires translatable visible and accessible static labels',()=>assert.equal(lint('const x=<button title="Save changes">Save</button>').length,2));
test('accepts English-fallback keys and leaves protocol values unchanged',()=>assert.equal(lint('const x=<input type="email" aria-label={t("email")} value={person.email}/>').length,0));
