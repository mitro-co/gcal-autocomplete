BUILD_DIR:=$(shell pwd)/build
SRCS_DIR:=$(shell pwd)/extension

FIREFOX_BUILD_DIR=$(BUILD_DIR)/firefox
FIREFOX_SUBDIRS=$(FIREFOX_BUILD_DIR)/data $(FIREFOX_BUILD_DIR)/lib
SAFARI_BUILD_DIR=$(BUILD_DIR)/safari
CHROME_BUILD_DIR=$(BUILD_DIR)/chrome

COMMON_SRCS_DIR=$(SRCS_DIR)/common
FIREFOX_SRCS_DIR=$(SRCS_DIR)/firefox
SAFARI_SRCS_DIR=$(SRCS_DIR)/safari
CHROME_SRCS_DIR=$(SRCS_DIR)/chrome

COMMON_SRCS=$(wildcard $(COMMON_SRCS_DIR)/*.*)
FIREFOX_SRCS=$(wildcard $(FIREFOX_SRCS_DIR)/*.*)
SAFARI_SRCS=$(wildcard $(SAFARI_SRCS_DIR)/*.*)
CHROME_SRCS=$(wildcard $(SAFARI_SRCS_DIR)/*.*)

define MKDIR_RULE
$(1):
	mkdir -p $(1)
endef

define COPY_RULE
$(2): $(1) | $(dir $(2))
	@echo $(2)
	@cp $(1) $(2)
endef

$(foreach d,$(BUILD_DIR) $(FIREFOX_BUILD_DIR) $(FIREFOX_SUBDIRS) $(SAFARI_BUILD_DIR) $(CHROME_BUILD_DIR),$(eval $(call MKDIR_RULE,$(d))))

$(foreach file,$(COMMON_SRCS),$(eval $(call COPY_RULE,$(file),$(FIREFOX_BUILD_DIR)/data/$(notdir $(file)))))
$(foreach file,$(COMMON_SRCS),$(eval $(call COPY_RULE,$(file),$(SAFARI_BUILD_DIR)/$(notdir $(file)))))
$(foreach file,$(COMMON_SRCS),$(eval $(call COPY_RULE,$(file),$(CHROME_BUILD_DIR)/$(notdir $(file)))))

FIREFOX_DEPS= \
    $(foreach file,$(COMMON_SRCS),$(FIREFOX_BUILD_DIR)/data/$(notdir $(file))) \
    $(FIREFOX_BUILD_DIR)/data/helper.js \
    $(FIREFOX_BUILD_DIR)/lib/main.js \
    $(FIREFOX_BUILD_DIR)/lib/package.json

SAFARI_DEPS= \
    $(foreach file,$(COMMON_SRCS),$(SAFARI_BUILD_DIR)/$(notdir $(file))) \
    $(SAFARI_BUILD_DIR)/helper.js \
    $(SAFARI_BUILD_DIR)/Info.plist

CHROME_DEPS= \
    $(foreach file,$(COMMON_SRCS),$(CHROME_BUILD_DIR)/$(notdir $(file))) \
    $(CHROME_BUILD_DIR)/helper.js \
    $(CHROME_BUILD_DIR)/manifest.json

$(FIREFOX_BUILD_DIR)/data/helper.js: $(FIREFOX_BUILD_DIR)/data
	@cp $(FIREFOX_SRCS_DIR)/helper.js $(FIREFOX_BUILD_DIR)/data

$(FIREFOX_BUILD_DIR)/lib/main.js: $(FIREFOX_BUILD_DIR)/lib
	@cp $(FIREFOX_SRCS_DIR)/main.js $(FIREFOX_BUILD_DIR)/lib

$(FIREFOX_BUILD_DIR)/lib/package.json: $(FIREFOX_BUILD_DIR)
	@cp $(FIREFOX_SRCS_DIR)/package.json $(FIREFOX_BUILD_DIR)

$(SAFARI_BUILD_DIR)/helper.js: $(FIREFOX_BUILD_DIR)
	@cp $(SAFARI_SRCS_DIR)/helper.js $(SAFARI_BUILD_DIR)
	
$(SAFARI_BUILD_DIR)/Info.plist: $(SAFARI_BUILD_DIR)
	@cp $(SAFARI_SRCS_DIR)/Info.plist $(SAFARI_BUILD_DIR)

$(CHROME_BUILD_DIR)/helper.js: $(CHROME_BUILD_DIR)
	@cp $(CHROME_SRCS_DIR)/helper.js $(CHROME_BUILD_DIR)

$(CHROME_BUILD_DIR)/manifest.json: $(CHROME_BUILD_DIR)
	@cp $(CHROME_SRCS_DIR)/manifest.json $(CHROME_BUILD_DIR)

firefox: $(FIREFOX_DEPS)
safari: $(SAFARI_DEPS)
chrome: $(CHROME_DEPS)

clean:
	rm -rf $(BUILD_DIR)

all: firefox safari chrome
