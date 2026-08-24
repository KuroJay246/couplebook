const { withMainActivity } = require('expo/config-plugins');
const { addImports } = require('@expo/config-plugins/build/android/codeMod');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const PLUGIN_TAG = 'couplebook-react-activity-key-guards';

function getGuardMethods(language) {
  if (language === 'java') {
    return [
      '  @Override',
      '  public boolean onKeyDown(int keyCode, KeyEvent event) {',
      '    if (getReactDelegate() == null) {',
      '      return false;',
      '    }',
      '    return super.onKeyDown(keyCode, event);',
      '  }',
      '',
      '  @Override',
      '  public boolean onKeyUp(int keyCode, KeyEvent event) {',
      '    if (getReactDelegate() == null) {',
      '      return false;',
      '    }',
      '    return super.onKeyUp(keyCode, event);',
      '  }',
      '',
      '  @Override',
      '  public boolean onKeyLongPress(int keyCode, KeyEvent event) {',
      '    if (getReactDelegate() == null) {',
      '      return false;',
      '    }',
      '    return super.onKeyLongPress(keyCode, event);',
      '  }',
    ].join('\n');
  }

  return [
    '  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {',
    '    if (reactDelegate == null) {',
    '      return false',
    '    }',
    '    return super.onKeyDown(keyCode, event)',
    '  }',
    '',
    '  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {',
    '    if (reactDelegate == null) {',
    '      return false',
    '    }',
    '    return super.onKeyUp(keyCode, event)',
    '  }',
    '',
    '  override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {',
    '    if (reactDelegate == null) {',
    '      return false',
    '    }',
    '    return super.onKeyLongPress(keyCode, event)',
    '  }',
  ].join('\n');
}

module.exports = function withReactActivityKeyGuards(config) {
  return withMainActivity(config, (config) => {
    const { modResults } = config;
    const { language } = modResults;

    const withImports = addImports(modResults.contents, ['android.view.KeyEvent'], language === 'java');
    const signature =
      language === 'java'
        ? 'public boolean onKeyDown(int keyCode, KeyEvent event)'
        : 'override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean';

    if (withImports.includes(signature)) {
      return {
        ...config,
        modResults: {
          ...modResults,
          contents: withImports,
        },
      };
    }

    const guardMethods = getGuardMethods(language);
    const patched = mergeContents({
      src: withImports,
      comment: language === 'java' ? '  //' : '  //',
      tag: PLUGIN_TAG,
      offset: 0,
      anchor: /override fun invokeDefaultOnBackPressed\(\)|public void invokeDefaultOnBackPressed\(\)/,
      newSrc: `${guardMethods}\n`,
    });

    return {
      ...config,
      modResults: {
        ...modResults,
        contents: patched.contents,
      },
    };
  });
};
