package ai.picovoice.reactnative.rhinodemo;

import javax.annotation.Nullable;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import android.os.Bundle;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Resources;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;


public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "RhinoDemo";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {    
      return new ReactActivityDelegate(this, getMainComponentName()) {
          @Nullable
          @Override
          protected Bundle getLaunchOptions() {              
              Bundle bundle = new Bundle();
              return bundle;
          }
      };
  }  
}
