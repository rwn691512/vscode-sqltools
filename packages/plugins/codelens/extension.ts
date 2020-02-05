import { languages, Disposable, window, workspace, TextEditor } from 'vscode';
import SQLToolsCodeLensProvider from './provider';
import { sortText } from '@sqltools/util/text';
import { IExtensionPlugin } from '@sqltools/types';
import Context from '@sqltools/vscode/context';
import { EXT_NAMESPACE } from '@sqltools/util/constants';
import { getEditorQueryDetails } from '@sqltools/vscode/utils/query';
import Config from '@sqltools/util/config-manager';

export default class CodeLensPlugin implements IExtensionPlugin {
  private codelensDisposable: Disposable;
  private registeredLanguages: string[] = [];
  private provider: SQLToolsCodeLensProvider;
  async dispose() {
    if (!this.codelensDisposable) return;
    await this.codelensDisposable.dispose();
    this.codelensDisposable = null;
  }

  async createCodelens() {
    const oldLang = this.registeredLanguages.sort(sortText);
    const newLang = Config.codelensLanguages.sort(sortText);
    const shouldRegister = newLang.length > 0 && (oldLang.join() !== newLang.join());

    if (!shouldRegister) return;

    if(this.codelensDisposable) {
      await this.dispose();
    }
    this.provider = new SQLToolsCodeLensProvider();
    this.codelensDisposable = languages.registerCodeLensProvider(
      Config.codelensLanguages.map(language => ({ language })),
      this.provider,
    );
    this.registeredLanguages = Config.codelensLanguages;
  }

  createDecorations() {
    window.onDidChangeActiveTextEditor(editor => {
      this.updateDecorations(editor);
    }, null, Context.subscriptions);

    workspace.onDidChangeTextDocument(event => {
      if (window.activeTextEditor && event.document === window.activeTextEditor.document) {
        this.updateDecorations(window.activeTextEditor);
      }
    }, null, Context.subscriptions);
    window.onDidChangeTextEditorSelection(event => {
      if (event.textEditor && event.textEditor.document === window.activeTextEditor.document) {
        this.updateDecorations(window.activeTextEditor);
      }
    }, null, Context.subscriptions);
    this.updateDecorations(window.activeTextEditor);
  }

  register() {
    Context.subscriptions.push(this);
    this.createCodelens();
    this.createDecorations();
    Config.addOnUpdateHook(({ event }) => {
      if (event.affectsConfig('codelensLanguages')) {
        this.createCodelens();
      }
    });
  }

  reset() {
    return this.provider.reset();
  }
  updateDecorations = (editor: TextEditor) => {
    if (!editor || !editor.document || editor.document.uri.scheme === 'output' || !this.registeredLanguages.includes(editor.document.languageId)) {
      return;
    }
    try {
      editor.setDecorations(currentQueryDecoration, []);
      const { range } = getEditorQueryDetails(editor);
      const decoration = { range };
      editor.setDecorations(currentQueryDecoration, [decoration]);
    } catch (error) {
      console.log(error);
    }
  }
}

const currentQueryDecoration = window.createTextEditorDecorationType({
  backgroundColor: { id: `${EXT_NAMESPACE}.currentQueryBg` },
  borderColor: { id: `${EXT_NAMESPACE}.currentQueryOutline` },
  borderWidth: '1px',
  borderStyle: 'solid',
});